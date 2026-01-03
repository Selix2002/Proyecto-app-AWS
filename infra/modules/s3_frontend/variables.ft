
variable "bucket_name" {
  description = "Nombre del bucket S3 para el frontend (globalmente único)"
  type        = string
}

variable "enable_static_website" {
  description = "Habilitar hosting estático del bucket"
  type        = bool
  default     = true
}

variable "index_document" {
  description = "Documento index"
  type        = string
  default     = "index.html"
}

variable "error_document" {
  description = "Documento de error"
  type        = string
  default     = "error.html"
}

variable "enable_cors" {
  description = "Configurar CORS en el bucket"
  type        = bool
  default     = true
}

variable "cors_rules" {
  description = "Reglas CORS para el bucket"
  type = list(object({
    allowed_methods = list(string)
    allowed_origins = list(string)
    allowed_headers = list(string)
    expose_headers  = optional(list(string), [])
    max_age_seconds = optional(number, 0)
  }))
  default = [
    {
      allowed_methods = ["GET", "HEAD"]
      allowed_origins = ["*"]
      allowed_headers = ["*"]
      expose_headers  = []
      max_age_seconds = 300
    }
  ]
}

variable "force_destroy" {
  description = "Permitir borrar el bucket aunque tenga objetos (útil en Dev)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Etiquetas comunes"
  type        = map(string)
  default     = {}
}
