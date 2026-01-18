# Módulo Terraform: DynamoDB

Este módulo es una pieza reutilizable que define la infraestructura de datos para la librería. Está diseñado para ser invocado desde diferentes entornos (como `dev`), garantizando que la estructura de las tablas sea idéntica en todos ellos.


## Descripción del Módulo

El módulo crea las **4 tablas principales** necesarias para el funcionamiento de la aplicación, utilizando un esquema de nombres basado en un prefijo para evitar colisiones entre los miembros del equipo. Todas las tablas están configuradas en modo **On-Demand** (`PAY_PER_REQUEST`) para optimizar costes en el entorno de aprendizaje.

### Tablas Definidas

| Tabla | Partition Key (PK) | GSI (Índice Secundario) | Propósito |
| :--- | :--- | :--- | :--- |
| **Users** | `dni` (S) | `EmailIndex` (email) | Almacena datos de usuarios y permite login por email. |
| **Books** | `bookId` (S) | - | Catálogo de libros disponibles. |
| **Carts** | `userId` (S) | - | Persistencia del carrito de compras por usuario. |
| **Orders** | `orderId` (S) | `UserIdIndex` (userId) | Historial de pedidos con búsqueda por cliente |

---

## Archivos del Módulo

### 1. `variables.tf`
Define los parámetros de entrada que el módulo requiere para ser flexible:
* **`project_prefix`**: Obligatorio. Se usa para nombrar las tablas (ej: `eugenio-users`).
* **`tags`**: Mapa de etiquetas para organizar y rastrear costes en AWS.
* **`billing_mode`**: Por defecto es `PAY_PER_REQUEST`, pero permite cambiar a modo provisionado si fuera necesario.

### 2. `main.tf`
Contiene la declaración de recursos de AWS:
* Configura cada tabla con sus atributos clave (`attribute`).
* Implementa **Global Secondary Indexes (GSI)** con `projection_type = "ALL"` para asegurar que todas las consultas devuelvan los datos completos sin lecturas adicionales.

### 3. `outputs.tf`
Expone la información necesaria para conectar este módulo con el resto de la infraestructura:
* **Nombres de tablas**: Para que la Lambda sepa exactamente a qué tabla conectar (inyectados como variables de entorno).
* **ARNs de tablas**: Identificadores únicos requeridos por el módulo de IAM para autorizar a la Lambda a leer/escribir en estas tablas.

---

## Uso del Módulo

Para utilizar este módulo desde un entorno (ej: `infra/envs/dev`), se debe declarar de la siguiente manera:

```hcl
module "dynamodb_libreria" {
  source         = "../../modules/dynamodb"
  project_prefix = "tu-nombre"
  
  tags = {
    Environment = "dev"
    Team        = "Equipo-4"
  }
}
