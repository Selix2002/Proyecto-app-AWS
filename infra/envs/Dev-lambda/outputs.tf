#//envs/Dev-lambda/outputs.tf
output "api_url" {
  value = module.lambda_backend.api_url
}
