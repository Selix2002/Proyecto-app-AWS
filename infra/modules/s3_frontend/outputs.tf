
output "bucket_name" {
  value       = aws_s3_bucket.this.bucket
  description = "Nombre del bucket S3"
}

output "website_endpoint" {
  value       = try(aws_s3_bucket_website_configuration.this[0].website_endpoint, null)
  description = "Endpoint del sitio estático (HTTP)"
}
