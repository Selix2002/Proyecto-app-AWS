# //modules/lambda_backend/main.tf
locals {
  use_existing_role = trimspace(var.role_arn) != ""
}


resource "aws_iam_role" "lambda_role" {
  count = local.use_existing_role ? 0 : 1

  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action = "sts:AssumeRole"
    }]
  })
}

# Logs a CloudWatch
resource "aws_iam_role_policy_attachment" "basic_logs" {
  count = local.use_existing_role ? 0 : 1

  role       = aws_iam_role.lambda_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "ddb_policy" {
  count = local.use_existing_role ? 0 : 1

  name = "${var.function_name}-ddb-policy"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem","dynamodb:DeleteItem",
        "dynamodb:Query","dynamodb:Scan","dynamodb:BatchGetItem","dynamodb:BatchWriteItem"
      ],
        Resource = concat(
          var.ddb_table_arns,
          [for arn in var.ddb_table_arns : "${arn}/index/*"]
)
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ddb_attach" {
  count = local.use_existing_role ? 0 : 1

  role       = aws_iam_role.lambda_role[0].name
  policy_arn = aws_iam_policy.ddb_policy[0].arn
}

resource "aws_lambda_function" "backend" {
  function_name = var.function_name
  role = local.use_existing_role ? var.role_arn : aws_iam_role.lambda_role[0].arn

  runtime = var.runtime
  handler = var.handler

  filename         = var.zip_path
  source_code_hash = filebase64sha256(var.zip_path)

  memory_size = var.memory_size
  timeout     = var.timeout

  environment {
    variables = var.environment
  }
}

# HTTP API Gateway
resource "aws_apigatewayv2_api" "http_api" {
  name          = var.api_name
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_allow_origins
    allow_methods = var.cors_allow_methods
    allow_headers = var.cors_allow_headers
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

# Rutas: proxy + raíz
resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "allow_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
