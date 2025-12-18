resource "aws_cognito_user_pool" "this" {
  name = "${var.project_prefix}-${var.env}-user-pool"

  # Login con email
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"] # envía/verifica email según configuración del pool :contentReference[oaicite:1]{index=1}

  mfa_configuration = "OFF"

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  tags = var.tags
}

# App Client "server" (con secret): ideal si TODO pasa por backend
resource "aws_cognito_user_pool_client" "server" {
  name         = "${var.project_prefix}-${var.env}-server-client"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = true

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"

  access_token_validity = 60
  id_token_validity     = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  enable_token_revocation = true

  supported_identity_providers = ["COGNITO"]
}

# App Client "public" (SIN secret): si después quieres auth directo desde el navegador (opcional)
resource "aws_cognito_user_pool_client" "public" {
  count       = var.create_public_client ? 1 : 0
  name        = "${var.project_prefix}-${var.env}-public-client"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"
  supported_identity_providers  = ["COGNITO"]
}

# Grupos = roles
resource "aws_cognito_user_group" "admin" {
  user_pool_id = aws_cognito_user_pool.this.id
  name         = "admin"
  precedence   = 1
}

resource "aws_cognito_user_group" "cliente" {
  user_pool_id = aws_cognito_user_pool.this.id
  name         = "cliente"
  precedence   = 10
}

# (Opcional) Policy para tu Lambda/Backend si vas a usar AdminAddUserToGroup/AdminDeleteUser
data "aws_iam_policy_document" "cognito_admin_ops" {
  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminDeleteUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminUpdateUserAttributes"
    ]
    resources = [aws_cognito_user_pool.this.arn]
  }
}

resource "aws_iam_policy" "cognito_admin_ops" {
  name   = "${var.project_prefix}-${var.env}-cognito-admin-ops"
  policy = data.aws_iam_policy_document.cognito_admin_ops.json
}
