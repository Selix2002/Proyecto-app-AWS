terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

data "aws_region" "current" {}

# Función Lambda
resource "aws_lambda_function" "backend" {
  filename            = var.lambda_zip_path
  function_name       = "${var.project_prefix}-backend"
  role                = var.lambda_role_arn
  handler             = "handler.handler"
  runtime             = var.lambda_runtime
  timeout             = var.lambda_timeout
  memory_size         = var.lambda_memory_size
  source_code_hash    = filebase64sha256(var.lambda_zip_path)

  environment {
    variables = {
      DB_PROVIDER = "DynamoAWS"

      DDB_TABLE_BOOKS  = var.ddb_table_books
      DDB_TABLE_CARTS  = var.ddb_table_carts
      DDB_TABLE_ORDERS = var.ddb_table_orders
      DDB_TABLE_USERS  = var.ddb_table_users

      DDB_USERS_EMAIL_INDEX   = var.ddb_users_email_index
      DDB_ORDERS_USERID_INDEX = var.ddb_orders_userid_index

      CORS_ORIGINS = var.cors_origins

      COGNITO_REGION        = var.aws_region
      COGNITO_USER_POOL_ID  = var.cognito_user_pool_id
      COGNITO_CLIENT_ID     = var.cognito_client_id
      COGNITO_CLIENT_SECRET = var.cognito_client_secret
    }
  }

  tags = var.tags

  depends_on = [var.iam_policy_dependency]
}

# Function URL pública para la Lambda
resource "aws_lambda_function_url" "backend" {
  function_name          = aws_lambda_function.backend.function_name
  authorization_type    = "NONE"
  cors {
    allow_credentials = true
    allow_headers     = ["*"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    allow_origins     = [var.cors_origins]
    expose_headers    = ["*"]
    max_age           = 300
  }
}

# CloudWatch Log Group para la Lambda (para mejor control)
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.backend.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}
