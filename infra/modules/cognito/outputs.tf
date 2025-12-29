#//modules/cognito/outputs.tf
output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.this.arn
}

output "server_client_id" {
  value = aws_cognito_user_pool_client.server.id
}

output "server_client_secret" {
  value     = aws_cognito_user_pool_client.server.client_secret
  sensitive = true
}

output "public_client_id" {
  value = var.create_public_client ? aws_cognito_user_pool_client.public[0].id : null
}

output "admin_ops_policy_arn" {
  value = aws_iam_policy.cognito_admin_ops.arn
}
