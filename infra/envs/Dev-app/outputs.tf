# //envs/Dev-app/outputs.tf
output "user_pool_id" {
  value = module.cognito.user_pool_id
}

output "user_pool_arn" {
  value = module.cognito.user_pool_arn
}

output "server_client_id" {
  value = module.cognito.server_client_id
}

output "server_client_secret" {
  value = nonsensitive(module.cognito.server_client_secret)

}
