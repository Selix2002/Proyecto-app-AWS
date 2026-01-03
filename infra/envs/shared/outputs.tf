output "s3_website_endpoint" {
  value       = module.s3_frontend.website_endpoint
  description = "URL del sitio web en S3"
}

output "s3_bucket_name" {
  value       = module.s3_frontend.bucket_name
  description = "Nombre del bucket S3"
}

output "dynamodb_tables" {
  value = {
    books  = module.dynamodb.books_table_name
    carts  = module.dynamodb.carts_table_name
    orders = module.dynamodb.orders_table_name
    users  = module.dynamodb.users_table_name
  }
  description = "Nombres de las tablas DynamoDB"
}

output "lambda_function_url" {
  value       = module.lambda_backend.lambda_function_url
  description = "URL pública de la función Lambda (base URL para API calls)"
}

output "lambda_function_arn" {
  value       = module.lambda_backend.lambda_function_arn
  description = "ARN de la función Lambda"
}

output "lambda_log_group" {
  value       = module.lambda_backend.log_group_name
  description = "CloudWatch Log Group de Lambda"
}

output "iam_role_arn" {
  value       = module.iam_monitoring.lambda_role_arn
  description = "ARN del rol IAM de Lambda"
}
