output "rds_endpoint" {
  description = "RDS Postgres endpoint for restore scripts and local psql."
  value       = module.rds.endpoint
}

output "rds_password_secret_arn" {
  description = "Secrets Manager ARN for the RDS master password."
  value       = module.rds.password_secret_arn
}

output "postgrest_url" {
  description = "Base URL for the PostgREST ALB. Point the app's VITE_API_URL at this + '/rest/v1'."
  value       = module.ecs_postgrest.alb_url
}

output "postgrest_dns_name" {
  description = "Raw ALB DNS name; use this if no Route 53 subdomain is configured."
  value       = module.ecs_postgrest.alb_dns_name
}
