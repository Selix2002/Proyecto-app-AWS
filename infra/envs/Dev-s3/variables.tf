
variable "aws_region" {
  type        = string
  default     = "eu-west-1"
  description = "Región AWS"
}

variable "aws_profile" {
  type        = string
  default     = "libreria-dev"
  description = "Perfil AWS local (opcional)"
}

variable "bucket_name" {
  type        = string
  default     = "libreria-aws-norberto-frontend" # Asegúrate de que sea único global
  description = "Nombre del bucket S3"
}
