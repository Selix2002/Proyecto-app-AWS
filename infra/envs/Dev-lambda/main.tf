terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Módulo IAM
module "iam_monitoring" {
  source = "../../modules/iam_monitoring"

  project_prefix       = var.project_prefix
  aws_region           = var.aws_region
  cognito_user_pool_id = var.cognito_user_pool_id

  tags = {
    app = "libreria"
    env = "dev"
  }
}

# Módulo Lambda
module "lambda_backend" {
  source = "../../modules/lambda_backend"

  project_prefix = var.project_prefix
  lambda_zip_path = var.lambda_zip_path
  lambda_role_arn = module.iam_monitoring.lambda_role_arn

  # DynamoDB
  ddb_table_books  = var.ddb_table_books
  ddb_table_carts  = var.ddb_table_carts
  ddb_table_orders = var.ddb_table_orders
  ddb_table_users  = var.ddb_table_users

  ddb_users_email_index   = var.ddb_users_email_index
  ddb_orders_userid_index = var.ddb_orders_userid_index

  # CORS
  cors_origins = var.cors_origins

  # Cognito
  cognito_user_pool_id  = var.cognito_user_pool_id
  cognito_client_id     = var.cognito_client_id
  cognito_client_secret = var.cognito_client_secret

  # IAM Dependency
  iam_policy_dependency = module.iam_monitoring.lambda_role_arn

  tags = {
    app = "libreria"
    env = "dev"
  }
}
