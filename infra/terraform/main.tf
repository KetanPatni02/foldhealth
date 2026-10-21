locals {
  name_prefix = "foldhealth-${var.environment}"
}

module "vpc" {
  source      = "./modules/vpc"
  name_prefix = local.name_prefix
  vpc_cidr    = var.vpc_cidr
}

module "rds" {
  source                  = "./modules/rds"
  name_prefix             = local.name_prefix
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  instance_class          = var.rds_instance_class
  allocated_storage_gb    = var.rds_allocated_storage_gb
  engine_version          = var.rds_engine_version
  allowed_security_groups = [module.ecs_postgrest.task_security_group_id]
}

module "ecs_postgrest" {
  source                 = "./modules/ecs-postgrest"
  name_prefix            = local.name_prefix
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  public_subnet_ids      = module.vpc.public_subnet_ids
  rds_endpoint           = module.rds.endpoint
  rds_port               = module.rds.port
  rds_db_name            = module.rds.db_name
  rds_db_user            = module.rds.db_user
  rds_password_secret    = module.rds.password_secret_arn
  postgrest_image        = var.postgrest_image
  postgrest_cpu          = var.postgrest_cpu
  postgrest_memory       = var.postgrest_memory
  desired_count          = var.postgrest_desired_count
  supabase_jwt_secret    = var.supabase_jwt_secret
  alb_subdomain          = var.alb_subdomain
  route53_zone_name      = var.route53_zone_name
  aws_region             = var.aws_region
}
