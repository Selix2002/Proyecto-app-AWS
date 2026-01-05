#//envs/Dev-lambda/main.tf
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

locals {
  # Desde infra/envs/Dev-lambda -> raíz del repo -> backend/lambda.zip
  zip_path = "${path.module}/../../../app/backend/lambda.zip"
}

data "aws_dynamodb_table" "books"  { name = var.ddb_table_books_name }
data "aws_dynamodb_table" "carts"  { name = var.ddb_table_carts_name }
data "aws_dynamodb_table" "orders" { name = var.ddb_table_orders_name }
data "aws_dynamodb_table" "users"  { name = var.ddb_table_users_name }

module "lambda_backend" {
  source         = "../../modules/lambda_backend"
  role_arn       = var.lambda_role_arn
  function_name  = var.lambda_name
  zip_path       = local.zip_path

  ddb_table_arns = [
    data.aws_dynamodb_table.books.arn,
    data.aws_dynamodb_table.carts.arn,
    data.aws_dynamodb_table.orders.arn,
    data.aws_dynamodb_table.users.arn,
  ]

  cors_allow_origins = var.cors_allow_origins

  environment = {
    DB_PROVIDER = "DynamoAWS"
    DDB_TABLE_BOOKS  = "eugenio-books"
    DDB_TABLE_CARTS  = "eugenio-carts"
    DDB_TABLE_ORDERS = "eugenio-orders"
    DDB_TABLE_USERS  = "eugenio-users"
    DDB_USERS_EMAIL_INDEX   = "EmailIndex"
    DDB_ORDERS_USERID_INDEX = "UserIdIndex"
    CORS_ORIGINS = "http://mi-app-dev-libreria-aws-ssn2526.s3-website-us-east-1.amazonaws.com,http://localhost:5173"
    COGNITO_REGION        = var.cognito_region
    COGNITO_USER_POOL_ID  = var.cognito_user_pool_id
    COGNITO_CLIENT_ID     = var.cognito_client_id
    COGNITO_CLIENT_SECRET = var.cognito_client_secret
  }
}

