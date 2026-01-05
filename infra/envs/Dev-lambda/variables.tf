#//envs/Dev-lambda/variables.tf
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "ddb_table_books_name" {
  type    = string
  default = "eugenio-books"
}

variable "ddb_table_carts_name" {
  type    = string
  default = "eugenio-carts"
}

variable "ddb_table_orders_name" {
  type    = string
  default = "eugenio-orders"
}

variable "ddb_table_users_name" {
  type    = string
  default = "eugenio-users"
}


variable "lambda_name" {
  type    = string
  default = "libreria-backend"
}

variable "cors_allow_origins" {
  type    = list(string)
  default = ["*"]
}

variable "cognito_region" {
  type    = string
  default = "us-east-1"
}

variable "cognito_user_pool_id" {
  type = string
}

variable "cognito_client_id" {
  type = string
}

variable "cognito_client_secret" {
  type      = string
  sensitive = true
}
variable "lambda_role_arn" {
  type = string
}
