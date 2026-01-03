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

# ============================================================================
# MÓDULO S3 FRONTEND
# ============================================================================
module "s3_frontend" {
  source = "../../modules/s3_frontend"

  bucket_name    = var.s3_bucket_name
  index_document = "index.html"
  error_document = "index.html"
  force_destroy  = true

  tags = {
    app = "libreria"
    env = "shared"
  }
}

# MÓDULO DYNAMODB
# ============================================================================
module "dynamodb" {
  source = "../../modules/dynamodb"

  project_prefix = var.project_prefix
  region         = var.aws_region

  # Configuración de tablas
  tables_config = var.tables_config

  tags = {
    app = "libreria"
    env = "shared"
  }
}

# ============================================================================
# MÓDULO IAM MONITORING
# ============================================================================
module "iam_monitoring" {
  source = "../../modules/iam_monitoring"

  project_prefix       = var.project_prefix
  aws_region           = var.aws_region
  cognito_user_pool_id = var.cognito_user_pool_id

  tags = {
    app = "libreria"
    env = "shared"
  }
}

# ============================================================================
# MÓDULO LAMBDA BACKEND
# ============================================================================
module "lambda_backend" {
  source = "../../modules/lambda_backend"

  project_prefix = var.project_prefix
  lambda_zip_path = var.lambda_zip_path
  lambda_role_arn = module.iam_monitoring.lambda_role_arn

  # DynamoDB: recibe los nombres de las tablas del módulo dynamodb
  ddb_table_books  = module.dynamodb.books_table_name
  ddb_table_carts  = module.dynamodb.carts_table_name
  ddb_table_orders = module.dynamodb.orders_table_name
  ddb_table_users  = module.dynamodb.users_table_name

  ddb_users_email_index   = var.ddb_users_email_index
  ddb_orders_userid_index = var.ddb_orders_userid_index

  # CORS: usa la URL del frontend S3
  cors_origins = module.s3_frontend.website_endpoint

  # Cognito
  cognito_user_pool_id  = var.cognito_user_pool_id
  cognito_client_id     = var.cognito_client_id
  cognito_client_secret = var.cognito_client_secret

  # IAM Dependency
  iam_policy_dependency = module.iam_monitoring.lambda_role_arn

  tags = {
    app = "libreria"
    env = "shared"
  }

  depends_on = [
    module.dynamodb,
    module.iam_monitoring,
    module.s3_frontend
  ]
}
