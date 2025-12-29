# //envs/Dev-app/main.tf
module "cognito" {
  source               = "../../modules/cognito"
  project_prefix       = var.project_prefix
  env                  = var.env
  create_public_client = false # true si quieres un client para browser

  tags = {
    app = var.project_prefix
    env = var.env
  }
}
