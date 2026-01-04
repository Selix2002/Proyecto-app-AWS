
module "s3_frontend" {
  source                = "../../modules/s3_frontend"
  bucket_name           = var.bucket_name
  enable_static_website = true

  index_document = "index.html"
  error_document = "index.html"

  cors_rules = [
    {
      allowed_methods = ["GET", "HEAD"]
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

output "bucket_name" {
  value = module.s3_frontend.bucket_name
}

output "website_endpoint" {
  value = module.s3_frontend.website_endpoint
}
