#//modules/cognito/variables.tf
variable "project_prefix" { type = string }
variable "env"           { type = string }

variable "create_public_client" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
