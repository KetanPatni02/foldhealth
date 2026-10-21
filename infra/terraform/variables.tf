variable "aws_region" {
  description = "AWS region to deploy into. Default is us-east-1; match the Supabase region (ap-southeast-1) if latency to existing users matters."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name, used in resource tags and names."
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for the new VPC. Default is 10.42.0.0/16; override if peering with an existing VPC that uses this range."
  type        = string
  default     = "10.42.0.0/16"
}

variable "rds_instance_class" {
  description = "RDS instance class. t3.micro is the lowest-cost option that fits the current ~40 MB workload."
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage_gb" {
  description = "Initial allocated storage in GB. Autoscaling handles growth."
  type        = number
  default     = 20
}

variable "rds_engine_version" {
  description = "Postgres major.minor. Match the current Supabase project (17.6.x) so pg_dump output restores cleanly."
  type        = string
  default     = "17.6"
}

variable "postgrest_image" {
  description = "PostgREST Docker image. Pin by digest in prod once you've verified a build; the tag below is a placeholder."
  type        = string
  default     = "postgrest/postgrest:v12.2.3"
}

variable "postgrest_cpu" {
  description = "Fargate task CPU units. 256 = 0.25 vCPU, enough for the current workload."
  type        = number
  default     = 256
}

variable "postgrest_memory" {
  description = "Fargate task memory in MB. 512 is the minimum for a 256-CPU task."
  type        = number
  default     = 512
}

variable "postgrest_desired_count" {
  description = "Number of PostgREST tasks to keep running. 1 is fine for the current load; 2 across AZs when it's time to care about availability."
  type        = number
  default     = 1
}

variable "supabase_jwt_secret" {
  description = "The HS256 JWT secret from Supabase (Settings → API → JWT Secret). PostgREST uses this to validate the same tokens Supabase Auth issues, so the client doesn't have to switch auth providers during Phase 01. Sensitive; passed via -var-file or TF_VAR_supabase_jwt_secret, never committed."
  type        = string
  sensitive   = true
}

variable "alb_subdomain" {
  description = "Subdomain to expose the PostgREST ALB on, e.g. 'api' meaning api.foldhealth.org. The hosted zone must already exist in Route 53 if you want DNS wired here; leave empty to skip the DNS record and use the raw ALB DNS name."
  type        = string
  default     = ""
}

variable "route53_zone_name" {
  description = "Route 53 hosted zone name, e.g. 'foldhealth.org'. Required if alb_subdomain is set."
  type        = string
  default     = ""
}
