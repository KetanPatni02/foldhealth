provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project     = "foldhealth"
      managed_by  = "terraform"
      environment = var.environment
      origin      = "aws-migration-phase-01"
    }
  }
}
