output "tables" {
  value = {
    users = {
      name = module.tablas_eugenio.users_table_name
      arn  = module.tablas_eugenio.users_table_arn
    }
    books = {
      name = module.tablas_eugenio.books_table_name
      arn  = module.tablas_eugenio.books_table_arn
    }
    carts = {
      name = module.tablas_eugenio.carts_table_name
      arn  = module.tablas_eugenio.carts_table_arn
    }
    orders = {
      name = module.tablas_eugenio.orders_table_name
      arn  = module.tablas_eugenio.orders_table_arn
    }
  }
}