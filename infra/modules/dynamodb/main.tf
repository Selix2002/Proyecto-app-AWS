# 1. TABLA DE USUARIOS
# PK: dni (según enunciado) | GSI: email (para búsquedas)
resource "aws_dynamodb_table" "users" {
  name         = "${var.project_prefix}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "dni"

  attribute {
    name = "dni"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  tags = var.tags
}

# 2. TABLA DE LIBROS
# PK: bookId
resource "aws_dynamodb_table" "books" {
  name         = "${var.project_prefix}-books"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "bookId"

  attribute {
    name = "bookId"
    type = "S"
  }

  tags = var.tags
}

# 3. TABLA DE CARRITOS
# PK: userId (asociado al usuario que compra)
resource "aws_dynamodb_table" "carts" {
  name         = "${var.project_prefix}-carts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  tags = var.tags
}

# 4. TABLA DE PEDIDOS
# PK: orderId | GSI: userId (para ver "Mis pedidos")
resource "aws_dynamodb_table" "orders" {
  name         = "${var.project_prefix}-orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  tags = var.tags
}