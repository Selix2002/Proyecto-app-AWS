#//modules/lambda_backend/outputs.tf
output "api_url" {
  value = aws_apigatewayv2_api.http_api.api_endpoint
}

output "lambda_name" {
  value = aws_lambda_function.backend.function_name
}

output "lambda_arn" {
  value = aws_lambda_function.backend.arn
}
