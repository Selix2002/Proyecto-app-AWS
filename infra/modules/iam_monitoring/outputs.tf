output "lambda_role_arn" {
  value       = aws_iam_role.lambda_execution_role.arn
  description = "ARN del rol IAM para ejecutar Lambda"
}

output "lambda_role_name" {
  value       = aws_iam_role.lambda_execution_role.name
  description = "Nombre del rol IAM para ejecutar Lambda"
}
