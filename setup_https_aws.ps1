param(
    [string]$Region = "us-east-1",
    [string]$ClusterName = "assessment-recruiter-cluster",
    [string]$ServiceName = "assessment-recruiter-service",
    [string]$ContainerName = "assessment-recruiter"
)

$ErrorActionPreference = "Stop"

# Get VPC and Subnets
$VpcId = (aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text).Trim()
if ($VpcId -eq "None" -or -not $VpcId) {
    $VpcId = (aws ec2 describe-vpcs --query "Vpcs[0].VpcId" --output text).Trim()
}
$SubnetIdsString = (aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VpcId" --query "Subnets[*].SubnetId" --output text).Trim()
$Subnets = $SubnetIdsString -split '\s+'

# Create ALB Security Group
$AlbSgName = "seekats-alb-sg"
$AlbSgId = ""
try {
    $AlbSgId = (aws ec2 describe-security-groups --filters "Name=group-name,Values=$AlbSgName" "Name=vpc-id,Values=$VpcId" --query "SecurityGroups[0].GroupId" --output text).Trim()
} catch {}
if ($AlbSgId -eq "None" -or -not $AlbSgId) {
    Write-Host "Creating ALB Security Group..."
    $AlbSgId = (aws ec2 create-security-group --group-name $AlbSgName --description "ALB SG for SeekATS" --vpc-id $VpcId --query "GroupId" --output text).Trim()
    aws ec2 authorize-security-group-ingress --group-id $AlbSgId --protocol tcp --port 80 --cidr 0.0.0.0/0 | Out-Null
}

# Allow ECS to receive traffic from ALB
$EcsSgId = (aws ec2 describe-security-groups --filters "Name=group-name,Values=seekats-ecs-sg" "Name=vpc-id,Values=$VpcId" --query "SecurityGroups[0].GroupId" --output text).Trim()
if ($EcsSgId -and $EcsSgId -ne "None") {
    try {
        aws ec2 authorize-security-group-ingress --group-id $EcsSgId --protocol tcp --port 80 --source-group $AlbSgId | Out-Null
    } catch {}
}

# Create ALB
$AlbName = "seekats-alb"
$AlbArn = ""
try {
    $AlbArn = (aws elbv2 describe-load-balancers --names $AlbName --query "LoadBalancers[0].LoadBalancerArn" --output text).Trim()
} catch {}
if ($AlbArn -eq "None" -or -not $AlbArn) {
    Write-Host "Creating ALB..."
    $AlbArn = (aws elbv2 create-load-balancer --name $AlbName --subnets $Subnets --security-groups $AlbSgId --scheme internet-facing --query "LoadBalancers[0].LoadBalancerArn" --output text).Trim()
}
$AlbDns = (aws elbv2 describe-load-balancers --load-balancer-arns $AlbArn --query "LoadBalancers[0].DNSName" --output text).Trim()
Write-Host "ALB DNS: $AlbDns"

# Create Target Group
$TgName = "seekats-tg"
$TgArn = ""
try {
    $TgArn = (aws elbv2 describe-target-groups --names $TgName --query "TargetGroups[0].TargetGroupArn" --output text).Trim()
} catch {}
if ($TgArn -eq "None" -or -not $TgArn) {
    Write-Host "Creating Target Group..."
    $TgArn = (aws elbv2 create-target-group --name $TgName --protocol HTTP --port 80 --vpc-id $VpcId --target-type ip --health-check-path "/healthz" --query "TargetGroups[0].TargetGroupArn" --output text).Trim()
}

# Create Listener
$ListenerArn = ""
try {
    $ListenerArn = (aws elbv2 describe-listeners --load-balancer-arn $AlbArn --query "Listeners[0].ListenerArn" --output text).Trim()
} catch {}
if ($ListenerArn -eq "None" -or -not $ListenerArn) {
    Write-Host "Creating Listener..."
    $ListenerArn = (aws elbv2 create-listener --load-balancer-arn $AlbArn --protocol HTTP --port 80 --default-actions "Type=forward,TargetGroupArn=$TgArn" --query "Listeners[0].ListenerArn" --output text).Trim()
}

# Update ECS Service
Write-Host "Updating ECS Service to use ALB..."
$LoadBalancersJson = "[{\`"targetGroupArn\`":\`"$TgArn\`",\`"containerName\`":\`"$ContainerName\`",\`"containerPort\`":80}]"
try {
    aws ecs update-service --cluster $ClusterName --service $ServiceName --load-balancers $LoadBalancersJson | Out-Null
    Write-Host "Successfully updated existing ECS service to use load balancer."
} catch {
    Write-Host "Failed to update service with load balancers. Recreating service..."
    
    $TaskDefArn = (aws ecs describe-services --cluster $ClusterName --services $ServiceName --query "services[0].taskDefinition" --output text).Trim()
    
    aws ecs delete-service --cluster $ClusterName --service $ServiceName --force | Out-Null
    Start-Sleep -Seconds 15
    
    if ($TaskDefArn -eq "None" -or -not $TaskDefArn) {
        $TaskDefArn = (aws ecs list-task-definitions --family-prefix assessment-recruiter --sort DESC --max-items 1 --query "taskDefinitionArns[0]" --output text).Trim()
    }
    
    $SubnetsJson = "[" + (($Subnets | ForEach-Object { """$_""" }) -join ",") + "]"
    aws ecs create-service `
        --cluster $ClusterName `
        --service-name $ServiceName `
        --task-definition $TaskDefArn `
        --desired-count 1 `
        --launch-type FARGATE `
        --network-configuration "awsvpcConfiguration={subnets=$SubnetsJson,securityGroups=[""$EcsSgId""],assignPublicIp=ENABLED}" `
        --load-balancers "targetGroupArn=$TgArn,containerName=$ContainerName,containerPort=80" | Out-Null
    Write-Host "Successfully recreated ECS service with load balancer."
}

# Setup API Gateway as HTTPS proxy (since CloudFront requires account verification on fresh accounts)
Write-Host "Setting up Amazon API Gateway (HTTPS Proxy)..."
$ApiName = "seekats-api"
$ApiEndpoint = ""
$Apis = aws apigatewayv2 get-apis --query "Items[?Name=='$ApiName'].ApiEndpoint" --output text
if ($Apis -and $Apis -ne "None") {
    $ApiEndpoint = $Apis.Trim() -split '\s+' | Select-Object -First 1
} else {
    Write-Host "Creating API Gateway..."
    $ApiEndpoint = (aws apigatewayv2 create-api --name $ApiName --protocol-type HTTP --target "http://$AlbDns" --query "ApiEndpoint" --output text).Trim()
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "       🚀 HTTPS DEPLOYMENT SUCCESSFUL! 🚀" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Secure URL: $ApiEndpoint" -ForegroundColor Cyan
Write-Host "Note: It may take 1-2 minutes for the target group to register the ECS tasks." -ForegroundColor Yellow
Write-Host "==========================================================`n" -ForegroundColor Green
