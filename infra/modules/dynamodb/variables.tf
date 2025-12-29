variable "project_prefix" {
  type        = string
  description = "Prefijo para los nombres de los recursos (ej: 'eugenio')"
}

variable "tags" {
  type        = map(string)
  default     = {
    Project     = "Libreria-AWS"
    ManagedBy   = "Terraform"
    Assignment  = "Sistemas-Servicios-Nube"
  }
  description = "Etiquetas que se aplicarán a todos los recursos de DynamoDB"
}

# Para dar flexibilidad al equipo
variable "billing_mode" {
  type        = string
  default     = "PAY_PER_REQUEST"
  description = "Modo de facturación de las tablas (PROVISIONED o PAY_PER_REQUEST)"
}
