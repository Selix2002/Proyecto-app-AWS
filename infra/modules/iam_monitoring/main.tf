terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Rol IAM para la ejecución de Lambda
resource "aws_iam_role" "lambda_execution_role" {
  name               = "${var.project_prefix}-lambda-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

# Policy para escribir logs en CloudWatch
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy custom para acceso a DynamoDB (CRUD en todas las tablas)
resource "aws_iam_role_policy" "lambda_dynamodb_access" {
  name   = "${var.project_prefix}-lambda-dynamodb-policy"
  role   = aws_iam_role.lambda_execution_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid    = "DynamoDBTableAccess",
        Effect = "Allow",
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ],
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.project_prefix}-*"
        ]
      },
      {
        Sid    = "DynamoDBIndexAccess",
        Effect = "Allow",
        Action = [
          "dynamodb:Query"
        ],
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.project_prefix}-*/index/*"
        ]
      }
    ]
  })
}

# Policy para Cognito (si la Lambda necesita validar/interactuar con Cognito)
resource "aws_iam_role_policy" "lambda_cognito_access" {
  name   = "${var.project_prefix}-lambda-cognito-policy"
  role   = aws_iam_role.lambda_execution_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid    = "CognitoAccess",
        Effect = "Allow",
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminUpdateUserAttributes"
        ],
        Resource = "arn:aws:cognito-idp:${var.aws_region}:${data.aws_caller_identity.current.account_id}:userpool/${var.cognito_user_pool_id}"
      }
    ]
  })
}

# Data source para obtener el ID de la cuenta AWS
data "aws_caller_identity" "current" {}
