
output "bucket_name" {
  value       = aws_s3_bucket.this.bucket
  description = "Nombre del bucket S3 del frontend"
}

output "bucket_arn" {
  value       = aws_s3_bucket.this.arn
  description = "ARN del bucket"
}

output "website_endpoint" {
  value       = try(aws_s3_bucket_website_configuration.this[0].website_endpoint, null)
  description = "Endpoint del S3 static website"
}

output "website_domain" {
  value       = try(aws_s3_bucket_website_configuration.this[0].website_domain, null)
  description = "Dominio del S3 website (útil para DNS/CloudFront)"
}
