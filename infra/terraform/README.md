# Foldhealth AWS infrastructure (Terraform)

Terraform for the Foldhealth AWS footprint. Each phase of the migration ships IaC here; Phase 01 lands RDS Postgres + PostgREST on ECS Fargate.

## Prerequisites

- Terraform ≥ 1.6 installed.
- AWS CLI configured against the target account: `aws sts get-caller-identity` should succeed.
- The IAM principal needs permissions for VPC, RDS, ECS, ECR, ELBv2, Secrets Manager, IAM, Route 53, ACM, CloudWatch Logs.
- The Supabase JWT secret (dashboard → Settings → API → JWT Secret). This is loaded into Secrets Manager as `PGRST_JWT_SECRET` so PostgREST can validate the same tokens Supabase Auth issues during the transition.

## First-time init

```bash
cd infra/terraform
terraform init
```

Backend state is local for Phase 01. Before Phase 03 (hosting) lands, we move state to an S3 backend with DynamoDB locking (one-liner migration).

## Phase 01: apply

Pass the Supabase JWT secret via environment variable so it never lands in a file. All other variables have reasonable defaults.

```bash
export TF_VAR_supabase_jwt_secret='<paste from Supabase dashboard>'

# Optional: use a custom subdomain for PostgREST. Leave empty and you get the
# raw ALB DNS name over HTTP (fine for Phase 01 verification).
export TF_VAR_alb_subdomain=api
export TF_VAR_route53_zone_name=foldhealth.org

# Pick the region. Match Supabase (ap-southeast-1) if latency matters;
# default is us-east-1.
export TF_VAR_aws_region=ap-southeast-1

terraform plan
terraform apply
```

Expected run time: 12-18 minutes. RDS is the slow bit.

## Outputs

After apply:

```bash
terraform output rds_endpoint        # for restore scripts and local psql
terraform output postgrest_url       # https://api.foldhealth.org (or http://ALB-dns-name)
terraform output rds_password_secret_arn
```

Grab the RDS password out of Secrets Manager when you need it:

```bash
aws secretsmanager get-secret-value \
  --secret-id "$(terraform output -raw rds_password_secret_arn)" \
  --query SecretString --output text
```

## Destroy

```bash
# Flip deletion protection off first (we leave it on by default)
aws rds modify-db-instance \
  --db-instance-identifier foldhealth-prod-postgres \
  --no-deletion-protection \
  --apply-immediately

terraform destroy
```

Secrets Manager secrets have a 7-day recovery window; cancel with `aws secretsmanager restore-secret` within the window if you need them back.

## Module layout

```
infra/terraform/
  versions.tf, providers.tf, variables.tf, main.tf, outputs.tf
  modules/
    vpc/                 # VPC, 2 public + 2 private subnets across 2 AZs, IGW, route tables
    rds/                 # Postgres 17 db.t3.micro, encrypted, 7-day backups, private subnets
    ecs-postgrest/       # ECS cluster + Fargate service, ALB, task + exec IAM roles, Secrets, CloudWatch logs
```

Nothing here depends on anything outside of the account. Each module exposes its outputs so later phases can wire into them (Lambda VPC config in Phase 04, S3 bucket policies in Phase 02, etc.).
