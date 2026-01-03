variable "project_prefix" {
  type        = string
  description = "Prefijo para nombrar los recursos (ej: eugenio)"
}

variable "lambda_zip_path" {
  type        = string
  description = "Ruta del archivo lambda.zip con el código compilado del backend"
}

variable "lambda_role_arn" {
  type        = string
  description = "ARN del rol IAM para ejecutar la Lambda"
}

variable "lambda_runtime" {
  type        = string
  default     = "nodejs18.x"
  description = "Runtime de Node.js para la Lambda"
}

variable "lambda_timeout" {
  type        = number
  default     = 30
  description = "Timeout en segundos para la ejecución de Lambda"
}

variable "lambda_memory_size" {
  type        = number
  default     = 512
  description = "Memoria en MB para la Lambda"
}

# Variables de DynamoDB
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
  description = "Nombre del índice GSI para búsqueda por email en tabla Users"
}

variable "ddb_orders_userid_index" {
  type        = string
  description = "Nombre del índice GSI para búsqueda por userId en tabla Orders"
}

# Variables de CORS y Frontend
variable "cors_origins" {
  type        = string
  description = "URLs permitidas para CORS (ej: https://bucket.s3-website-us-east-1.amazonaws.com)"
}

# Variables de Cognito
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

# Variables adicionales
variable "log_retention_days" {
  type        = number
  default     = 7
  description = "Días de retención de logs en CloudWatch"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags para los recursos"
}

variable "iam_policy_dependency" {
  type        = any
  default     = null
  description = "Referencia a las políticas IAM (para asegurar orden de creación)"
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Región AWS para inyectar en variables de entorno"
}
