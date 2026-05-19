# AWS Deployment & CI/CD

This app is containerized and deployed to AWS ECS Fargate, with persistent data (SQLite and uploads) on AWS EFS. 

## Automated Deployment Scripts

To fully provision the AWS infrastructure from scratch on your local machine, run the following scripts in order. You must have Docker Desktop running and AWS CLI authenticated.

1. **Deploy ECS Infrastructure (`deploy_aws_infra.ps1`)**:
   Builds the Docker image, pushes it to ECR, provisions VPC Security Groups, EFS storage, and deploys the container in ECS Fargate.
   ```powershell
   .\deploy_aws_infra.ps1
   ```

2. **Deploy HTTPS Endpoint (`setup_https_aws.ps1`)**:
   Creates an Application Load Balancer (ALB) and routes traffic through an Amazon API Gateway HTTP API, providing a free `https://*.execute-api.*.amazonaws.com` domain for your application.
   ```powershell
   .\setup_https_aws.ps1
   ```

## GitHub Actions CI/CD

A CI/CD pipeline is configured in `.github/workflows/deploy-aws.yml`. Every time you push to the `main` branch, the pipeline will automatically build the new image and deploy it to your ECS cluster.

### Required GitHub Secrets

To enable the pipeline, you must add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

- `AWS_ACCESS_KEY_ID`: An access key for an IAM user with permissions to ECR and ECS.
- `AWS_SECRET_ACCESS_KEY`: The corresponding secret key.

*(Note: The region is defaulted to `us-east-1`. If you change regions, update `AWS_REGION` in `deploy-aws.yml`).*

## Environment Variables

The ECS Task requires the following environment variables (defined in your local `.env` during the initial script run):
- `PORT`: `80`
- `DATABASE_URL`: `sqlite:////data/assessment_recruiter.db` (Mapped to EFS)
- `UPLOAD_DIR`: `/data/uploads` (Mapped to EFS)
- Additional secrets for Gemini, Azure Communication Services, and Twilio.