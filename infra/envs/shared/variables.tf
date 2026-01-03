variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Región AWS"
}

variable "project_prefix" {
  type        = string
  description = "Prefijo para nombrar todos los recursos (ej: eugenio)"
}

# ============================================================================
# S3 FRONTEND
# ============================================================================
variable "s3_bucket_name" {
  type        = string
  description = "Nombre del bucket S3 para el frontend (debe ser único globalmente)"
}

# ============================================================================
# DYNAMODB
# ============================================================================
variable "tables_config" {
  type = map(object({
    pk_name = string
    pk_type = string
    sk_name = optional(string)
    sk_type = optional(string)
    gsi = optional(map(object({
      pk_name = string
      pk_type = string
      sk_name = optional(string)
      sk_type = optional(string)
    })))
  }))
  description = "Configuración de tablas DynamoDB"
}

# ============================================================================
# LAMBDA
# ============================================================================
variable "lambda_zip_path" {
  type        = string
  description = "Ruta al archivo lambda.zip compilado"
}

variable "ddb_users_email_index" {
  type        = string
  description = "Nombre del índice GSI para Users (email)"
}

variable "ddb_orders_userid_index" {
  type        = string
  description = "Nombre del índice GSI para Orders (userId)"
}

# ============================================================================
# COGNITO
# ============================================================================
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
