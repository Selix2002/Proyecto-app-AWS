output "lambda_function_arn" {
  value       = aws_lambda_function.backend.arn
  description = "ARN de la función Lambda del backend"
}

output "lambda_function_name" {
  value       = aws_lambda_function.backend.function_name
  description = "Nombre de la función Lambda del backend"
}

output "lambda_function_url" {
  value       = aws_lambda_function_url.backend.function_url
  description = "URL pública para invocar la función Lambda (Function URL)"
}

output "log_group_name" {
  value       = aws_cloudwatch_log_group.lambda_logs.name
  description = "Nombre del CloudWatch Log Group para la Lambda"
}
