terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.60" }
  }
}

variable "name_prefix"           { type = string }
variable "vpc_id"                { type = string }
variable "private_subnet_ids"    { type = list(string) }
variable "public_subnet_ids"     { type = list(string) }
variable "rds_endpoint"          { type = string }
variable "rds_port"              { type = number }
variable "rds_db_name"           { type = string }
variable "rds_db_user"           { type = string }
variable "rds_password_secret"   { type = string }
variable "postgrest_image"       { type = string }
variable "postgrest_cpu"         { type = number }
variable "postgrest_memory"      { type = number }
variable "desired_count"         { type = number }
variable "supabase_jwt_secret" {
  type      = string
  sensitive = true
}
variable "alb_subdomain"         { type = string }
variable "route53_zone_name"     { type = string }
variable "aws_region"            { type = string }

# ── Secrets for the PostgREST task ─────────────────────────────────────────
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.name_prefix}-postgrest-jwt-secret"
  recovery_window_in_days = 7
  description             = "HS256 JWT secret shared with the token issuer. Phase 01: the Supabase JWT secret so unchanged Supabase tokens still verify. Phase 04 swaps this for the Cognito-derived secret."
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.supabase_jwt_secret
}

# ── Security groups ────────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb"
  description = "PostgREST ALB: inbound 443 from internet."
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "task" {
  name        = "${var.name_prefix}-postgrest"
  description = "PostgREST tasks: inbound 3000 from the ALB only."
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Egress for image pull, Secrets Manager, CloudWatch, RDS"
  }
}

resource "aws_security_group_rule" "task_from_alb" {
  type                     = "ingress"
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.task.id
  source_security_group_id = aws_security_group.alb.id
  description              = "ALB → PostgREST"
}

# ── ACM cert + Route 53 record (only when a subdomain is configured) ──────
data "aws_route53_zone" "this" {
  count = var.alb_subdomain != "" && var.route53_zone_name != "" ? 1 : 0
  name  = var.route53_zone_name
}

locals {
  fqdn = var.alb_subdomain != "" && var.route53_zone_name != "" ? "${var.alb_subdomain}.${var.route53_zone_name}" : ""
}

resource "aws_acm_certificate" "this" {
  count             = local.fqdn != "" ? 1 : 0
  domain_name       = local.fqdn
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = local.fqdn != "" ? {
    for dvo in aws_acm_certificate.this[0].domain_validation_options :
    dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  } : {}

  zone_id = data.aws_route53_zone.this[0].zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.value]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "this" {
  count                   = local.fqdn != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ── ALB ────────────────────────────────────────────────────────────────────
resource "aws_lb" "this" {
  name               = "${var.name_prefix}-postgrest"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "this" {
  name        = "${var.name_prefix}-postgrest"
  port        = 3000
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "https" {
  count             = local.fqdn != "" ? 1 : 0
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.this[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

# When no custom domain, expose HTTP for Phase 01 verification. Flip to HTTPS
# with a self-signed or Let's Encrypt cert when a subdomain lands.
resource "aws_lb_listener" "http" {
  count             = local.fqdn == "" ? 1 : 0
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

resource "aws_route53_record" "alb" {
  count   = local.fqdn != "" ? 1 : 0
  zone_id = data.aws_route53_zone.this[0].zone_id
  name    = local.fqdn
  type    = "A"
  alias {
    name                   = aws_lb.this.dns_name
    zone_id                = aws_lb.this.zone_id
    evaluate_target_health = true
  }
}

# ── IAM for the Fargate task ───────────────────────────────────────────────
data "aws_iam_policy_document" "task_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${var.name_prefix}-postgrest-task-exec"
  assume_role_policy = data.aws_iam_policy_document.task_assume.json
}

resource "aws_iam_role_policy_attachment" "task_execution_managed" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "task_execution_secrets" {
  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_secretsmanager_secret.jwt_secret.arn,
      var.rds_password_secret,
    ]
  }
}

resource "aws_iam_role_policy" "task_execution_secrets" {
  name   = "secrets-read"
  role   = aws_iam_role.task_execution.id
  policy = data.aws_iam_policy_document.task_execution_secrets.json
}

resource "aws_iam_role" "task" {
  name               = "${var.name_prefix}-postgrest-task"
  assume_role_policy = data.aws_iam_policy_document.task_assume.json
}

# ── Task definition + service ─────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "task" {
  name              = "/aws/ecs/${var.name_prefix}-postgrest"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-postgrest"
}

resource "aws_ecs_task_definition" "this" {
  family                   = "${var.name_prefix}-postgrest"
  cpu                      = var.postgrest_cpu
  memory                   = var.postgrest_memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "postgrest"
      image     = var.postgrest_image
      essential = true
      portMappings = [{ containerPort = 3000, protocol = "tcp" }]

      environment = [
        { name = "PGRST_DB_URI",          value = "postgres://${var.rds_db_user}@${var.rds_endpoint}:${var.rds_port}/${var.rds_db_name}" },
        { name = "PGRST_DB_SCHEMAS",      value = "public,storage,graphql_public" },
        { name = "PGRST_DB_ANON_ROLE",    value = "anon" },
        { name = "PGRST_JWT_AUD",         value = "authenticated" },
        { name = "PGRST_SERVER_PORT",     value = "3000" },
        { name = "PGRST_SERVER_HOST",     value = "*4" },
        { name = "PGRST_DB_POOL",         value = "10" },
        { name = "PGRST_DB_POOL_TIMEOUT", value = "10" },
      ]

      secrets = [
        { name = "PGRST_DB_PASSWORD",  valueFrom = var.rds_password_secret },
        { name = "PGRST_JWT_SECRET",   valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.task.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "postgrest"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "this" {
  name            = "${var.name_prefix}-postgrest"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  # Tasks run on the public subnets so they can pull the image from Docker Hub
  # and reach Secrets Manager without a NAT gateway. The task security group
  # still gates inbound traffic to the ALB only.
  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.task.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = "postgrest"
    container_port   = 3000
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200
}

output "alb_dns_name"              { value = aws_lb.this.dns_name }
output "alb_url"                   { value = local.fqdn != "" ? "https://${local.fqdn}" : "http://${aws_lb.this.dns_name}" }
output "task_security_group_id"    { value = aws_security_group.task.id }
output "cluster_name"              { value = aws_ecs_cluster.this.name }
output "service_name"              { value = aws_ecs_service.this.name }
