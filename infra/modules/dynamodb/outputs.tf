###############################################################################
# OUTPUTS PARA LAMBDA (Variables de entorno y Permisos IAM)
###############################################################################

# Nombres de las tablas (La Lambda los necesita como variables de entorno)
output "users_table_name" {
  value       = aws_dynamodb_table.users.name
  description = "Nombre físico de la tabla de Usuarios"
}

output "books_table_name" {
  value       = aws_dynamodb_table.books.name
  description = "Nombre físico de la tabla de Libros"
}

output "carts_table_name" {
  value       = aws_dynamodb_table.carts.name
  description = "Nombre físico de la tabla de Carritos"
}

output "orders_table_name" {
  value       = aws_dynamodb_table.orders.name
  description = "Nombre físico de la tabla de Pedidos"
}

# ARNs de las tablas (El integrante IAM los necesita para las políticas de seguridad)
output "users_table_arn" {
  value       = aws_dynamodb_table.users.arn
  description = "ARN de la tabla de Usuarios para permisos IAM"
}

output "books_table_arn" {
  value       = aws_dynamodb_table.books.arn
  description = "ARN de la tabla de Libros para permisos IAM"
}

output "carts_table_arn" {
  value       = aws_dynamodb_table.carts.arn
  description = "ARN de la tabla de Carritos para permisos IAM"
}

output "orders_table_arn" {
  value       = aws_dynamodb_table.orders.arn
  description = "ARN de la tabla de Pedidos para permisos IAM"
}
