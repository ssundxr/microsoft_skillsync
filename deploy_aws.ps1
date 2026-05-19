param(
    [string]$Region = "us-east-1",
    [string]$RepositoryName = "assessment-recruiter",
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

Write-Host "Checking prerequisites..." -ForegroundColor Cyan
docker version | Out-Null
aws --version | Out-Null

$AccountId = (aws sts get-caller-identity --query Account --output text).Trim()
$Registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$ImageUri = "$Registry/${RepositoryName}:${ImageTag}"

Write-Host "Ensuring ECR repository exists: $RepositoryName" -ForegroundColor Cyan
$RepoExists = $true
try {
    aws ecr describe-repositories --repository-names $RepositoryName --region $Region | Out-Null
} catch {
    $RepoExists = $false
}

if (-not $RepoExists) {
    aws ecr create-repository --repository-name $RepositoryName --region $Region | Out-Null
}

Write-Host "Logging in to ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $Registry | Out-Null

Write-Host "Building image..." -ForegroundColor Cyan
docker build -t ${RepositoryName}:${ImageTag} .

Write-Host "Tagging image..." -ForegroundColor Cyan
docker tag ${RepositoryName}:${ImageTag} $ImageUri

Write-Host "Pushing image..." -ForegroundColor Cyan
docker push $ImageUri

Write-Host "`nImage pushed successfully:" -ForegroundColor Green
Write-Host $ImageUri
Write-Host "`nNext step: use this image URI in ECS Fargate, App Runner, or another AWS container runtime. If you need persistent SQLite/uploads, mount EFS to /data and set DATABASE_URL + UPLOAD_DIR accordingly." -ForegroundColor Yellow
