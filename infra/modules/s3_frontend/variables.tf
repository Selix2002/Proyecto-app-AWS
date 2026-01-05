#//modules/s3_frontend/variables.tf
variable "bucket_name" {
  type        = string
  description = "Nombre del bucket S3 (debe ser único globalmente)"
}

variable "enable_static_website" {
  type        = bool
  default     = true
  description = "Habilita el hosting estático del bucket (S3 Website)"
}

variable "index_document" {
  type        = string
  default     = "index.html"
  description = "Documento principal del sitio"
}

variable "error_document" {
  type        = string
  default     = "index.html"
  description = "Documento de error; en SPA suele redirigir a index.html"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Etiquetas del bucket"
}

variable "cors_rules" {
  type = list(object({
    allowed_methods = list(string)
    allowed_origins = list(string)
    allowed_headers = list(string)
    expose_headers  = optional(list(string))
    max_age_seconds = optional(number)
  }))
  default     = []
  description = "Reglas CORS del bucket (opcional)"
}
variable "upload_dir" {
  type    = string
  default = ""
}

