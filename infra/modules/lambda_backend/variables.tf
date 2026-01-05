#//modules/lambda_backend/variables.tf
variable "function_name" {
  type = string
}

variable "zip_path" {
  type = string
}

variable "handler" {
  type    = string
  default = "handler.handler"
}

variable "runtime" {
  type    = string
  default = "nodejs20.x"
}

variable "memory_size" {
  type    = number
  default = 512
}

variable "timeout" {
  type    = number
  default = 20
}

variable "environment" {
  type    = map(string)
  default = {}
}
variable "ddb_table_arns" {
  type        = list(string)
  description = "ARNs de tablas DynamoDB (para restringir permisos)."
}


variable "api_name" {
  type    = string
  default = "libreria-http-api"
}

variable "cors_allow_origins" {
  type    = list(string)
  default = ["*"]
}

variable "cors_allow_headers" {
  type    = list(string)
  default = ["content-type", "authorization"]
}

variable "cors_allow_methods" {
  type    = list(string)
  default = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}
variable "role_arn" {
  type    = string
  default = ""
}
