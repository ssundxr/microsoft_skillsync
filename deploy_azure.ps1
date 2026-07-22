# SkillSync Azure Infrastructure Setup v4 (FINAL - Reusing CodeRAG-Group)
# Run this script with Docker Desktop RUNNING.

$RESOURCE_GROUP = "CodeRAG-Group"
$LOCATION = "centralindia"
$APP_SERVICE_PLAN = "ASP-CodeRAGGroup-85ee"
$SUFFIX = Get-Random -Maximum 99999
$ACR_NAME = "skillsyncacr$SUFFIX"
$WEB_APP_NAME = "skillsync-app-$SUFFIX"
$STORAGE_ACCOUNT = "skillsyncstore$SUFFIX"
$FILE_SHARE = "skillsyncdata"

Write-Host "--- 1. Checking Docker Readiness ---" -ForegroundColor Cyan
docker version > $null 2>&1
if ($? -eq $false) {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit
}

Write-Host "--- 2. Resource Group: Using Existing ($RESOURCE_GROUP) ---" -ForegroundColor Cyan
# No need to create RG as we are reusing CodeRAG-Group

Write-Host "--- 3. Creating Azure Container Registry ($ACR_NAME) ---" -ForegroundColor Cyan
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true
$ACR_LOGIN_SERVER = (az acr show --name $ACR_NAME --query "loginServer" -o tsv)
$ACR_USER = (az acr credential show --name $ACR_NAME --query "username" -o tsv)
$ACR_PASS = (az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

Write-Host "--- 4. Creating Web App (Reusing Plan: $APP_SERVICE_PLAN) ---" -ForegroundColor Cyan
az webapp create --resource-group $RESOURCE_GROUP --plan $APP_SERVICE_PLAN --name $WEB_APP_NAME --deployment-container-image-name "mcr.microsoft.com/azuredocs/container-apps-helloworld:latest"

Write-Host "--- 5. Setting up Persistent Storage ($STORAGE_ACCOUNT) ---" -ForegroundColor Cyan
az storage account create --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --location $LOCATION --sku Standard_LRS
$STORAGE_KEY = (az storage account keys list --resource-group $RESOURCE_GROUP --account-name $STORAGE_ACCOUNT --query "[0].value" -o tsv)
az storage share create --name $FILE_SHARE --account-name $STORAGE_ACCOUNT --account-key $STORAGE_KEY

Write-Host "--- 6. Mapping Storage to Container ---" -ForegroundColor Cyan
az webapp config storage-account add --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME --custom-id "skillsync-data-mount" --storage-type AzureFiles --share-name $FILE_SHARE --account-name $STORAGE_ACCOUNT --access-key $STORAGE_KEY --mount-path "/data"

Write-Host "--- 7. Generating GitHub Service Principal Credentials ---" -ForegroundColor Cyan
$subId = (az account show --query "id" -o tsv)
$spJson = (az ad sp create-for-rbac --name "skillsync-github-deploy-final" --role contributor --scopes "/subscriptions/$subId/resourceGroups/$RESOURCE_GROUP" --sdk-auth)

Write-Host "--- INFRASTRUCTURE READY (REUSING CODERAG PLAN) ---" -ForegroundColor Green
Write-Host "`nAdd these as SECRETS in GitHub (Settings > Secrets > Actions):" -ForegroundColor Yellow
Write-Host "ACR_LOGIN_SERVER: $ACR_LOGIN_SERVER"
Write-Host "ACR_USERNAME: $ACR_USER"
Write-Host "ACR_PASSWORD: $ACR_PASS"
Write-Host "AZURE_WEBAPP_NAME: $WEB_APP_NAME"
Write-Host "AZURE_CREDENTIALS: (Copy the JSON below)" -ForegroundColor Yellow
Write-Host $spJson
