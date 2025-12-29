provider "aws" {
  region = "us-east-1" # Normalmente Academy usa esta
}

module "tablas_eugenio" {
  source         = "../../modules/dynamodb"
  project_prefix = "eugenio"
}

output "mis_tablas" {
  value = module.tablas_eugenio.books_table_name
}
