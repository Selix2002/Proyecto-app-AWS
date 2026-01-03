variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Región AWS"
}

variable "project_prefix" {
  type        = string
  description = "Prefijo para nombrar los recursos (ej: eugenio)"
}

variable "lambda_zip_path" {
  type        = string
  description = "Ruta local del archivo lambda.zip compilado"
}

# DynamoDB
variable "ddb_table_books" {
  type        = string
  description = "Nombre de la tabla DynamoDB para libros"
}

variable "ddb_table_carts" {
  type        = string
  description = "Nombre de la tabla DynamoDB para carritos"
}

variable "ddb_table_orders" {
  type        = string
  description = "Nombre de la tabla DynamoDB para órdenes"
}

variable "ddb_table_users" {
  type        = string
  description = "Nombre de la tabla DynamoDB para usuarios"
}

variable "ddb_users_email_index" {
  type        = string
  description = "Nombre del índice GSI para Users (email)"
}

variable "ddb_orders_userid_index" {
  type        = string
  description = "Nombre del índice GSI para Orders (userId)"
}

# CORS y Frontend
variable "cors_origins" {
  type        = string
  description = "URL del frontend S3 (para CORS)"
}

# Cognito
variable "cognito_user_pool_id" {
  type        = string
  description = "ID del Cognito User Pool"
}

variable "cognito_client_id" {
  type        = string
  description = "ID del cliente de Cognito"
}

variable "cognito_client_secret" {
  type        = string
  sensitive   = true
  description = "Secret del cliente de Cognito"
}
