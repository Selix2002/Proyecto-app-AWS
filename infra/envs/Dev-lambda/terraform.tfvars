aws_region = "us-east-1"
project_prefix = "eugenio"

# Ruta al archivo lambda.zip compilado (AJUSTA ESTA RUTA)
# Desde infra/envs/Dev-lambda/, el path sería:
lambda_zip_path = "C:\\Users\\nabel\\Documents\\AWS\\Proyecto-app-AWS\\app\\backend\\lambda.zip"

# DynamoDB
ddb_table_books  = "eugenio-books"
ddb_table_carts  = "eugenio-carts"
ddb_table_orders = "eugenio-orders"
ddb_table_users  = "eugenio-users"

ddb_users_email_index   = "EmailIndex"
ddb_orders_userid_index = "UserIdIndex"

# CORS: URL proporcionada por el integrante de S3
cors_origins = "https://eugenio-frontend.s3-website-us-east-1.amazonaws.com"

# Cognito (OBTENER DEL INTEGRANTE DE COGNITO)
cognito_user_pool_id  = "us-east-1_xxxxxxxxx"
cognito_client_id     = "xxxxxxxxxxxxxxxxxxxxxxxx"
cognito_client_secret = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
