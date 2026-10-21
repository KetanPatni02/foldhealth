terraform {
  required_providers {
    aws    = { source = "hashicorp/aws",    version = "~> 5.60" }
    random = { source = "hashicorp/random", version = "~> 3.6"  }
  }
}

variable "name_prefix"              { type = string }
variable "vpc_id"                   { type = string }
variable "private_subnet_ids"       { type = list(string) }
variable "instance_class"           { type = string }
variable "allocated_storage_gb"     { type = number }
variable "engine_version"           { type = string }
variable "allowed_security_groups"  { type = list(string) }

resource "random_password" "db_master" {
  length  = 32
  special = false
  upper   = true
  lower   = true
  numeric = true
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.name_prefix}-rds-master-password"
  recovery_window_in_days = 7
  description             = "RDS master password for ${var.name_prefix}. Rotation not configured in Phase 01; add aws_secretsmanager_secret_rotation when it matters."
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_master.result
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-rds"
  subnet_ids = var.private_subnet_ids
  tags = { Name = "${var.name_prefix}-rds-subnets" }
}

resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds"
  description = "RDS Postgres: inbound 5432 only from the PostgREST task SG."
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group_rule" "rds_from_postgrest" {
  for_each                 = toset(var.allowed_security_groups)
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = each.key
  description              = "PostgREST → RDS"
}

resource "aws_db_instance" "this" {
  identifier     = "${var.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  db_name  = "foldhealth"
  username = "foldhealth"
  password = random_password.db_master.result

  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:30-sun:05:30"
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.name_prefix}-postgres-final-${formatdate("YYYYMMDD-hhmmss", timestamp())}"
  deletion_protection       = true

  performance_insights_enabled = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports      = ["postgresql"]

  apply_immediately = false

  lifecycle {
    ignore_changes = [final_snapshot_identifier, password]
  }
}

output "endpoint"             { value = aws_db_instance.this.address }
output "port"                 { value = aws_db_instance.this.port }
output "db_name"              { value = aws_db_instance.this.db_name }
output "db_user"              { value = aws_db_instance.this.username }
output "password_secret_arn"  { value = aws_secretsmanager_secret.db_password.arn }
output "security_group_id"    { value = aws_security_group.rds.id }
