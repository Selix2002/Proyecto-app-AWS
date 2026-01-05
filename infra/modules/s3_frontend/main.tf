# //modules/s3_frontend/main.tf
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
  tags   = var.tags
}

# Permitir política pública (GetObject) para website
resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Static Website Hosting (SPA → index.html para index y error)
resource "aws_s3_bucket_website_configuration" "this" {
  count  = var.enable_static_website ? 1 : 0
  bucket = aws_s3_bucket.this.id

  index_document {
    suffix = var.index_document
  }

  error_document {
    key = var.error_document
  }
}

# Política pública: permitir GET a objetos
data "aws_iam_policy_document" "public_read" {
  statement {
    sid     = "PublicReadGetObject"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    resources = ["${aws_s3_bucket.this.arn}/*"]
  }
}

resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.this.id
  policy = data.aws_iam_policy_document.public_read.json
}

# CORS opcional (usa dynamic para listas de reglas)
resource "aws_s3_bucket_cors_configuration" "this" {
  count  = length(var.cors_rules) > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id

  dynamic "cors_rule" {
    for_each = var.cors_rules
    content {
      allowed_methods = cors_rule.value.allowed_methods
      allowed_origins = cors_rule.value.allowed_origins
      allowed_headers = cors_rule.value.allowed_headers
      expose_headers  = try(cors_rule.value.expose_headers, null)
      max_age_seconds = try(cors_rule.value.max_age_seconds, null)
    }
  }
}

locals {
  upload_enabled = trimspace(var.upload_dir) != ""
  files          = local.upload_enabled ? fileset(var.upload_dir, "**/*") : []

  mime_types = {
    ".html"  = "text/html"
    ".css"   = "text/css"
    ".js"    = "application/javascript"
    ".json"  = "application/json"
    ".png"   = "image/png"
    ".jpg"   = "image/jpeg"
    ".jpeg"  = "image/jpeg"
    ".svg"   = "image/svg+xml"
    ".ico"   = "image/x-icon"
    ".webp"  = "image/webp"
    ".woff"  = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"   = "font/ttf"
    ".map"   = "application/json"
    ".txt"   = "text/plain"
    ".mjs" = "application/javascript"
  }
}

resource "aws_s3_object" "site" {
  for_each = local.upload_enabled ? toset(local.files) : []

  bucket = aws_s3_bucket.this.id
  key    = each.value
  source = "${var.upload_dir}/${each.value}"
  etag   = filemd5("${var.upload_dir}/${each.value}")

content_type = lookup(
  local.mime_types, 
  lower(
    length(split(".", each.value)) > 1
    ? ".${element(reverse(split(".", each.value)), 0)}"
    : ""
  ),
  "application/octet-stream"
)


}
