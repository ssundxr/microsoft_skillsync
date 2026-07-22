param(
    [string]$Region = "us-east-1",
    [string]$RepositoryName = "assessment-recruiter",
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

Write-Host "--- 1. Checking Prerequisites ---" -ForegroundColor Cyan
docker version > $null 2>&1
if ($? -eq $false) {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit
}

aws sts get-caller-identity > $null 2>&1
if ($? -eq $false) {
    Write-Host "ERROR: AWS CLI is not authenticated or not installed. Please run 'aws configure' first." -ForegroundColor Red
    exit
}

$AccountId = (aws sts get-caller-identity --query Account --output text).Trim()
$Registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$ImageUri = "$Registry/${RepositoryName}:${ImageTag}"

Write-Host "AWS Account ID: $AccountId" -ForegroundColor Green
Write-Host "AWS Region:     $Region" -ForegroundColor Green
Write-Host "ECR Image URI:  $ImageUri" -ForegroundColor Green

Write-Host "`n--- 2. Setting up ECR Repository ---" -ForegroundColor Cyan
$RepoExists = $true
try {
    aws ecr describe-repositories --repository-names $RepositoryName --region $Region > $null 2>&1
} catch {
    $RepoExists = $false
}

if (-not $RepoExists) {
    Write-Host "Creating ECR repository: $RepositoryName" -ForegroundColor Yellow
    aws ecr create-repository --repository-name $RepositoryName --region $Region | Out-Null
} else {
    Write-Host "ECR Repository already exists."
}

Write-Host "Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $Registry

Write-Host "Building Docker image locally..." -ForegroundColor Yellow
docker build -t ${RepositoryName}:${ImageTag} .

Write-Host "Tagging and pushing container image to ECR..." -ForegroundColor Yellow
docker tag ${RepositoryName}:${ImageTag} $ImageUri
docker push $ImageUri

Write-Host "`n--- 3. Setting up Networking & Security Groups ---" -ForegroundColor Cyan
$VpcId = (aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text).Trim()
if ($VpcId -eq "None" -or -not $VpcId) {
    Write-Host "Default VPC not found, using the first available VPC..." -ForegroundColor Yellow
    $VpcId = (aws ec2 describe-vpcs --query "Vpcs[0].VpcId" --output text).Trim()
}
Write-Host "Using VPC: $VpcId"

$SubnetIdsString = (aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VpcId" --query "Subnets[*].SubnetId" --output text).Trim()
$Subnets = $SubnetIdsString -split '\s+'
Write-Host "Detected Subnets: ($($Subnets -join ', '))"

# Create Security Group for ECS Tasks
$EcsSgName = "skillsync-ecs-sg"
$EcsSgId = ""
try {
    $EcsSgId = (aws ec2 describe-security-groups --filters "Name=group-name,Values=$EcsSgName" "Name=vpc-id,Values=$VpcId" --query "SecurityGroups[0].GroupId" --output text).Trim()
} catch {}

if ($EcsSgId -eq "None" -or -not $EcsSgId) {
    Write-Host "Creating ECS Security Group..." -ForegroundColor Yellow
    $EcsSgId = (aws ec2 create-security-group --group-name $EcsSgName --description "Security Group for SkillSync ECS Task" --vpc-id $VpcId --query "GroupId" --output text).Trim()
} else {
    Write-Host "ECS Security Group already exists: $EcsSgId"
}

# Ensure port 80 is authorized (failsafe)
try {
    aws ec2 authorize-security-group-ingress --group-id $EcsSgId --protocol tcp --port 80 --cidr 0.0.0.0/0 2>&1 | Out-Null
} catch {}

# Create Security Group for EFS
$EfsSgName = "skillsync-efs-sg"
$EfsSgId = ""
try {
    $EfsSgId = (aws ec2 describe-security-groups --filters "Name=group-name,Values=$EfsSgName" "Name=vpc-id,Values=$VpcId" --query "SecurityGroups[0].GroupId" --output text).Trim()
} catch {}

if ($EfsSgId -eq "None" -or -not $EfsSgId) {
    Write-Host "Creating EFS Security Group..." -ForegroundColor Yellow
    $EfsSgId = (aws ec2 create-security-group --group-name $EfsSgName --description "Security Group for SkillSync EFS" --vpc-id $VpcId --query "GroupId" --output text).Trim()
    # Allow inbound NFS (2049) from ECS Task Security Group
    aws ec2 authorize-security-group-ingress --group-id $EfsSgId --protocol tcp --port 2049 --source-group $EcsSgId | Out-Null
} else {
    Write-Host "EFS Security Group already exists: $EfsSgId"
}

Write-Host "`n--- 4. Setting up Persistent Storage (AWS EFS) ---" -ForegroundColor Cyan
$EfsToken = "skillsync-efs-token"
$FileSystemId = ""
try {
    $FileSystemId = (aws efs describe-file-systems --creation-token $EfsToken --query "FileSystems[0].FileSystemId" --output text).Trim()
} catch {}

if ($FileSystemId -eq "None" -or -not $FileSystemId) {
    Write-Host "Creating Amazon EFS file system..." -ForegroundColor Yellow
    $FileSystemId = (aws efs create-file-system --creation-token $EfsToken --tags Key=Name,Value=skillsync-efs --query "FileSystemId" --output text).Trim()
} else {
    Write-Host "Amazon EFS already exists: $FileSystemId"
}

# Wait for EFS to become available
Write-Host "Waiting for EFS File System to be active..." -ForegroundColor Yellow
while ($true) {
    $LifeCycleState = (aws efs describe-file-systems --file-system-id $FileSystemId --query "FileSystems[0].LifeCycleState" --output text).Trim()
    if ($LifeCycleState -eq "available") {
        break
    }
    Write-Host "Current State: $LifeCycleState. Waiting 5s..."
    Start-Sleep -Seconds 5
}
Write-Host "Amazon EFS is active!" -ForegroundColor Green

# Create EFS Mount Targets
Write-Host "Configuring EFS Mount Targets in default subnets..." -ForegroundColor Yellow
foreach ($Subnet in $Subnets) {
    if (-not $Subnet) { continue }
    $MountTargetExists = $false
    try {
        $MountTargets = (aws efs describe-mount-targets --file-system-id $FileSystemId --query "MountTargets[?SubnetId=='$Subnet'].MountTargetId" --output text).Trim()
        if ($MountTargets -and $MountTargets -ne "None") {
            $MountTargetExists = $true
        }
    } catch {}
    
    if (-not $MountTargetExists) {
        Write-Host "Creating EFS mount target in subnet $Subnet..."
        try {
            aws efs create-mount-target --file-system-id $FileSystemId --subnet-id $Subnet --security-groups $EfsSgId | Out-Null
        } catch {
            Write-Host "Note: Subnet mount target setup skipped or failed (may already exist/be overlapping)." -ForegroundColor Gray
        }
    }
}

# Create EFS Access Point (required to mount sqlite in containers with correct read/write permissions)
$AccessPointId = ""
try {
    $AccessPoints = (aws efs describe-access-points --file-system-id $FileSystemId --query "AccessPoints[0].AccessPointId" --output text).Trim()
    if ($AccessPoints -and $AccessPoints -ne "None") {
        $AccessPointId = $AccessPoints
    }
} catch {}

if (-not $AccessPointId) {
    Write-Host "Creating EFS Access Point at /data..." -ForegroundColor Yellow
    $AccessPointId = (aws efs create-access-point --file-system-id $FileSystemId --posix-user Uid=1000,Gid=1000 --root-directory "Path=/data,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}" --query "AccessPointId" --output text).Trim()
} else {
    Write-Host "EFS Access Point already exists: $AccessPointId"
}

Write-Host "`n--- 5. Configuring ECS IAM Roles ---" -ForegroundColor Cyan
# Task Execution Role
$ExecRoleName = "ecsTaskExecutionRole"
$ExecRoleArn = ""
try {
    $ExecRoleArn = (aws iam get-role --role-name $ExecRoleName --query "Role.Arn" --output text).Trim()
} catch {}

if (-not $ExecRoleArn) {
    Write-Host "Creating ECS Execution Role..." -ForegroundColor Yellow
    $AssumeRolePolicy = '{"Version":"2012-10-17","Statement":[{"Sid":"","Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
    $TempPolicyFile = Join-Path $env:TEMP "ecs-assume-policy.json"
    Set-Content -Path $TempPolicyFile -Value $AssumeRolePolicy
    $ExecRoleArn = (aws iam create-role --role-name $ExecRoleName --assume-role-policy-document "file://$TempPolicyFile" --query "Role.Arn" --output text).Trim()
    Remove-Item $TempPolicyFile
    aws iam attach-role-policy --role-name $ExecRoleName --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
} else {
    Write-Host "ECS Execution Role already exists: $ExecRoleArn"
}

# Task Role (allows containers to write to EFS)
$TaskRoleName = "ecsTaskRole-skillsync"
$TaskRoleArn = ""
try {
    $TaskRoleArn = (aws iam get-role --role-name $TaskRoleName --query "Role.Arn" --output text).Trim()
} catch {}

if (-not $TaskRoleArn) {
    Write-Host "Creating ECS Task Role..." -ForegroundColor Yellow
    $AssumeRolePolicy = '{"Version":"2012-10-17","Statement":[{"Sid":"","Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
    $TempPolicyFile = Join-Path $env:TEMP "ecs-assume-policy.json"
    Set-Content -Path $TempPolicyFile -Value $AssumeRolePolicy
    $TaskRoleArn = (aws iam create-role --role-name $TaskRoleName --assume-role-policy-document "file://$TempPolicyFile" --query "Role.Arn" --output text).Trim()
    Remove-Item $TempPolicyFile
    aws iam attach-role-policy --role-name $TaskRoleName --policy-arn "arn:aws:iam::aws:policy/AmazonElasticFileSystemClientReadWriteAccess"
} else {
    Write-Host "ECS Task Role already exists: $TaskRoleArn"
}

# Cloudwatch log group
Write-Host "Ensuring CloudWatch log group exists..." -ForegroundColor Yellow
try {
    aws logs create-log-group --log-group-name "/ecs/assessment-recruiter" --region $Region > $null 2>&1
} catch {}

Write-Host "`n--- 6. Registering ECS Task Definition ---" -ForegroundColor Cyan
$TemplatePath = "aws/ecs-task-definition.template.json"
$TaskDefContent = Get-Content -Path $TemplatePath -Raw

Write-Host "Reading local .env variables..." -ForegroundColor Yellow
$EnvFile = ".\.env"
if (Test-Path $EnvFile) {
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match '^\s*([^#]\w+)\s*=\s*(.*)$') {
            $key = $matches[1]
            $value = $matches[2].Trim().Replace('"', '\"')
            $TaskDefContent = $TaskDefContent.Replace("<$key>", $value)
        }
    }
}

$TaskDefContent = $TaskDefContent.Replace("<ECS_EXECUTION_ROLE_ARN>", $ExecRoleArn)
$TaskDefContent = $TaskDefContent.Replace("<ECS_TASK_ROLE_ARN>", $TaskRoleArn)
$TaskDefContent = $TaskDefContent.Replace("<ECR_IMAGE_URI>", $ImageUri)
$TaskDefContent = $TaskDefContent.Replace("<EFS_FILE_SYSTEM_ID>", $FileSystemId)
$TaskDefContent = $TaskDefContent.Replace("<EFS_ACCESS_POINT_ID>", $AccessPointId)

$TempTaskDefFile = Join-Path $env:TEMP "rendered-task-def.json"
Set-Content -Path $TempTaskDefFile -Value $TaskDefContent
Write-Host "Registering task definition..." -ForegroundColor Yellow
$TaskDefArn = (aws ecs register-task-definition --cli-input-json "file://$TempTaskDefFile" --query "taskDefinition.taskDefinitionArn" --output text).Trim()
Remove-Item $TempTaskDefFile
Write-Host "Registered: $TaskDefArn" -ForegroundColor Green

Write-Host "`n--- 7. Creating ECS Cluster & Service ---" -ForegroundColor Cyan
$ClusterName = "assessment-recruiter-cluster"
Write-Host "Ensuring ECS Cluster exists..." -ForegroundColor Yellow
aws ecs create-cluster --cluster-name $ClusterName --region $Region | Out-Null

$ServiceName = "assessment-recruiter-service"
$ServiceExists = $false
try {
    $ServiceStatus = (aws ecs describe-services --cluster $ClusterName --services $ServiceName --query "services[0].status" --output text).Trim()
    if ($ServiceStatus -eq "ACTIVE") {
        $ServiceExists = $true
    }
} catch {}

$SubnetsJson = "[" + (($Subnets | ForEach-Object { """$_""" }) -join ",") + "]"

if ($ServiceExists) {
    Write-Host "ECS Service already exists. Deploying new task definition..." -ForegroundColor Yellow
    aws ecs update-service --cluster $ClusterName --service $ServiceName --task-definition $TaskDefArn --force-new-deployment | Out-Null
} else {
    Write-Host "Creating new ECS Service in Fargate..." -ForegroundColor Yellow
    aws ecs create-service `
        --cluster $ClusterName `
        --service-name $ServiceName `
        --task-definition $TaskDefArn `
        --desired-count 1 `
        --launch-type FARGATE `
        --network-configuration "awsvpcConfiguration={subnets=$SubnetsJson,securityGroups=[""$EcsSgId""],assignPublicIp=ENABLED}" `
        | Out-Null
}

Write-Host "`n--- 8. Fetching Task Public IP & Endpoint ---" -ForegroundColor Cyan
Write-Host "Waiting for ECS service task placement..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$TaskArn = ""
for ($i = 0; $i -lt 15; $i++) {
    $TaskArns = (aws ecs list-tasks --cluster $ClusterName --service-name $ServiceName --query "taskArns[0]" --output text).Trim()
    if ($TaskArns -and $TaskArns -ne "None") {
        $TaskArn = $TaskArns
        break
    }
    Write-Host "Waiting for task to spawn ($($i * 5)s)..."
    Start-Sleep -Seconds 5
}

if (-not $TaskArn) {
    Write-Host "ERROR: Task did not spawn within timeline." -ForegroundColor Red
    exit
}

# Wait for task attachment/network configuration
$EniId = ""
for ($i = 0; $i -lt 15; $i++) {
    $EniId = (aws ecs describe-tasks --cluster $ClusterName --tasks $TaskArn --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text).Trim()
    if ($EniId -and $EniId -ne "None") {
        break
    }
    Write-Host "Waiting for ENI attachment..."
    Start-Sleep -Seconds 5
}

if (-not $EniId) {
    Write-Host "ERROR: Could not retrieve Network Interface ID." -ForegroundColor Red
    exit
}

# Query public IP
$PublicIp = ""
for ($i = 0; $i -lt 15; $i++) {
    $RawIp = (aws ec2 describe-network-interfaces --network-interface-ids $EniId --query "NetworkInterfaces[0].Association.PublicIp" --output text)
    if ($RawIp) {
        $PublicIp = $RawIp.Trim()
    }
    if (-not [string]::IsNullOrWhiteSpace($PublicIp) -and $PublicIp -ne "None") {
        break
    }
    Write-Host "Waiting for public IP association ($($i * 5)s)..."
    Start-Sleep -Seconds 5
}

if (-not $PublicIp -or $PublicIp -eq "None") {
    Write-Host "ERROR: Could not retrieve Public IP." -ForegroundColor Red
    exit
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "       🚀 SKILLSYNC DEPLOYED SUCCESSFULLY TO AWS! 🚀" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Task is running in ECS Fargate."
Write-Host "Persistent Database/Uploads hosted on Amazon EFS."
Write-Host "`nPublic URL: http://$PublicIp" -ForegroundColor Cyan
Write-Host "`nNote: It may take 1-2 minutes for the application to pull the image,"
Write-Host "start the server, and become fully reachable at this address." -ForegroundColor Yellow
Write-Host "==========================================================`n" -ForegroundColor Green
