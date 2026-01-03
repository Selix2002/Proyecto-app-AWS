variable "project_prefix" {
  type        = string
  description = "Prefijo para nombrar los recursos (ej: eugenio)"
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Región AWS"
}

variable "cognito_user_pool_id" {
  type        = string
  description = "ID del Cognito User Pool"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags para los recursos"
}
