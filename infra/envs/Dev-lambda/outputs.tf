output "lambda_function_url" {
  value       = module.lambda_backend.lambda_function_url
  description = "URL pública de la función Lambda"
}

output "lambda_function_arn" {
  value       = module.lambda_backend.lambda_function_arn
  description = "ARN de la función Lambda"
}

output "lambda_role_arn" {
  value       = module.iam_monitoring.lambda_role_arn
  description = "ARN del rol IAM de Lambda"
}

output "log_group_name" {
  value       = module.lambda_backend.log_group_name
  description = "Nombre del CloudWatch Log Group"
}
