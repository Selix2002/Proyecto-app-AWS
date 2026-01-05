#//#//envs/Dev-lambda/terraform.tfvars
cognito_user_pool_id  = "us-east-1_gdvRSiy4T"
cognito_client_id     = "1c4s13ukhlfr9mngbu2utq0ihk"
cognito_client_secret = "n1si95ecqjk6fmuji6ee9vopg6e7ucqd41fe3uhs6ghdj7o4u4o"
lambda_role_arn = "arn:aws:iam::533267036273:role/LabRole"
cors_allow_origins = [
  "http://mi-app-dev-libreria-aws-ssn2526.s3-website-us-east-1.amazonaws.com",
  "http://localhost:5173"
]
