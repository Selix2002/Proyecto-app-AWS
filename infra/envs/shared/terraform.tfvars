aws_region     = "us-east-1"
project_prefix = "eugenio"

# S3 Frontend
s3_bucket_name = "eugenio-libreria-frontend"

# Lambda
lambda_zip_path = "${path.module}/../../app/backend/lambda.zip"

# DynamoDB - Configuración de tablas
tables_config = {
  users = {
    pk_name = "userId"
    pk_type = "S"
    sk_name = null
    sk_type = null
    gsi = {
      EmailIndex = {
        pk_name = "email"
        pk_type = "S"
      }
    }
  }
  books = {
    pk_name = "bookId"
    pk_type = "S"
    sk_name = null
    sk_type = null
    gsi = {}
  }
  carts = {
    pk_name = "cartId"
    pk_type = "S"
    sk_name = "userId"
    sk_type = "S"
    gsi = {}
  }
  orders = {
    pk_name = "orderId"
    pk_type = "S"
    sk_name = null
    sk_type = null
    gsi = {
      UserIdIndex = {
        pk_name = "userId"
        pk_type = "S"
      }
    }
  }
}

# DynamoDB Índices
ddb_users_email_index   = "EmailIndex"
ddb_orders_userid_index = "UserIdIndex"

# Cognito (REEMPLAZAR CON VALORES REALES DEL INTEGRANTE DE COGNITO)
cognito_user_pool_id  = "us-east-1_xxxxxxxxx"
cognito_client_id     = "xxxxxxxxxxxxxxxxxxxxxxxx"
cognito_client_secret = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
