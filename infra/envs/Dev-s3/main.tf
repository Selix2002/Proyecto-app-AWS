module "s3_frontend" {
  source                = "../../modules/s3_frontend"
  bucket_name           = var.bucket_name
  enable_static_website = true

  enable_cors = true
  cors_rules = [
    {
      allowed_methods = ["GET", "HEAD", "POST", "PUT", "DELETE"]
      allowed_origins = ["*"]
      allowed_headers = ["*"]
      expose_headers  = []
      max_age_seconds = 300
    }
  ]

  tags = {
    Project = "libreria-aws"
    Env     = "Dev"
    Stack   = "Frontend"
    Owner   = "Integrante S3"
  }
}
