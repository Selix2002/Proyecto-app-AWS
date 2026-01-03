
variable "aws_region" {
  type        = string
  description = "Región AWS (ej. eu-west-1)"
  default     = "eu-west-1"
}

variable "bucket_name" {
  type        = string
  description = "Nombre del bucket S3 (debe ser único globalmente)"
}
