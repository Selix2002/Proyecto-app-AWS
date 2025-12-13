# 🏛️ Proyecto Librería AWS – Infraestructura como Código

Este repositorio gestiona el código de la **aplicación de librería online** y su **infraestructura en AWS** mediante **Terraform**.

-----

## 1. 🖼️ Arquitectura General (Overview)

La aplicación implementa una arquitectura Serverless en AWS:

- **Frontend:** Servido estáticamente desde un **bucket S3**.
- **Backend:** Implementado como una **función Lambda** con una Function URL pública.
- **Base de Datos:** **DynamoDB** (NoSQL) para persistencia.
- **Seguridad/Monitorización:** **IAM** para permisos y **CloudWatch** para observabilidad.

-----

## 2. 👥 Roles del Equipo

El equipo está compuesto por 4 integrantes. Tres de ellos se especializan en un servicio de AWS (S3, Lambda, DynamoDB) y el cuarto se enfoca en la aplicación (backend + modelo de datos) y su adaptación a la nube.

| Integrante                       | Rol Principal                             | Servicio / Enfoque         | Módulos / Carpetas Clave                            |
| :------------------------------- | :---------------------------------------- | :-------------------------- | :-------------------------------------------------- |
| **Diseñador / Desarrollador app**| Lógica de negocio y modelo de datos       | App (código)               | `app/backend/`, `app/frontend/`, capa `model/`      |
| **Integrante S3**                | Infraestructura de frontend estático      | Amazon S3                  | `infra/modules/s3_frontend/`, `infra/envs/integrante2/` |
| **Integrante DynamoDB**         | Modelo de datos en la nube (NoSQL)        | Amazon DynamoDB            | `infra/modules/dynamodb/`, `infra/envs/integrante3/`    |
| **Integrante Lambda**           | Backend serverless + permisos y logs      | AWS Lambda + IAM/CloudWatch| `infra/modules/lambda_backend/`, `infra/modules/iam_monitoring/`, `infra/envs/integrante4/` |

### Detalle de responsabilidades

#### 🧠 Diseñador / Desarrollador de la app

- Mantiene y evoluciona el **backend** en `app/backend/`:
- Adaptación de Express para funcionar dentro de **AWS Lambda**.
- Reemplazo de la capa MongoDB por acceso a **DynamoDB** (adaptación de la capa `model`).
- Ajusta el **frontend** para que consuma la Function URL de Lambda (`BASE_URL` en el `LibreriaProxy`).
- Define, junto con el equipo, los **contratos de datos** (qué espera cada endpoint, qué devuelve).
- Prueba la aplicación de punta a punta usando el entorno `infra/envs/shared/`.
- Documenta la arquitectura de la app (flujos, endpoints, decisiones de diseño).

#### ☁️ Integrante S3 – Frontend & Static Website

- Se encarga de la infraestructura del **frontend estático**:
  - Configura el módulo `infra/modules/s3_frontend/`:
    - Bucket S3.
    - Static website hosting.
    - Bucket policy pública para `s3:GetObject`.
  - Prepara el entorno `infra/envs/integrante2/` para desplegar **solo S3**.
- Documenta el flujo de:
  - `npm run build` (o similar).
  - Subida de artefactos al bucket (manual o automatizada).
- Colabora con el Diseñador para verificar que el frontend compilado funciona correctamente contra la Function URL de Lambda.

#### 📚 Integrante DynamoDB – Modelo de datos en AWS

- Diseña el **modelo de datos NoSQL** en `infra/modules/dynamodb/`:
  - Tablas: `Users`, `Books`, `Carts`, `Orders` (o nombres que se definan).
  - Claves primarias (partition/sort key).
  - **Índices secundarios globales (GSI)** para búsquedas (por `email`, `dni`, `userId`, etc.).
- Configura el modo de facturación de las tablas (por ejemplo `PAY_PER_REQUEST`).
- Prepara el entorno `infra/envs/integrante3/` para desplegar y probar **solo las tablas**.
- Trabaja con el Diseñador para alinear:
  - Estructura de items en DynamoDB.
  - Formato de los objetos que espera el backend (capa `model`).

#### ⚙️ Integrante Lambda – Backend serverless, IAM & Monitorización

- Diseña y configura la **infraestructura del backend**:
  - Módulo `infra/modules/lambda_backend/`:
    - Función Lambda (runtime Node.js, handler, código ZIP).
    - Function URL pública (`auth_type = "NONE"`) y CORS.
    - Variables de entorno (`JWT_SECRET`, nombres de tablas, etc.).
- Se hace cargo de la **seguridad y observabilidad básicas**:
  - Módulo `infra/modules/iam_monitoring/`:
    - Rol IAM de la Lambda (execution role).
    - Policies para acceder a **DynamoDB** (CRUD sobre las tablas del módulo `dynamodb`).
    - Permisos para escribir logs en **CloudWatch Logs**.
  - Configuración de logs y, opcionalmente, alarmas simples.
- Prepara el entorno `infra/envs/integrante4/` para probar la **Lambda + IAM** con tablas de DynamoDB.
- Trabaja con el Diseñador para asegurarse de que:
  - La Function URL está correctamente configurada.
  - Las rutas `/api/...` responden como espera el frontend.

### Entorno integrado (`infra/envs/shared/`)

- El entorno `infra/envs/shared/` se utiliza para **integrar todos los módulos**:
  - Se instancian:
    - `s3_frontend`
    - `dynamodb`
    - `iam_monitoring`
    - `lambda_backend`
  - Se conectan los outputs de `dynamodb` e `iam_monitoring` como inputs de `lambda_backend`.

## 3. 📂 Organización del Código

La estructura general del repositorio separa la lógica de la aplicación de la definición de la infraestructura (IaC).

```text
libreria-aws/
├── app/                  # Código de la aplicación
│   ├── backend/          # Backend (Express → Lambda)
│   ├── frontend/         # Frontend SPA
│   └── README.md
├── infra/                # Infraestructura como código (Terraform)
│   ├── modules/          # Módulos reutilizables por servicio
│   │   ├── s3_frontend/
│   │   ├── lambda_backend/
│   │   ├── dynamodb/
│   │   └── iam_monitoring/
│   └── envs/             # Entornos por persona + entorno compartido
│       ├── Dev-app/    
│       ├── Dev-s3/
│       ├── Dev-lambda/
│       ├── Dev-dynamodb/
│       └── shared/       # Entorno "oficial" de proyecto (todo integrado)
└── README.md
````

-----

## 4. 📦 Documentación de Infraestructura y Despliegue (Terraform)

Este apartado detalla la estructura del proyecto de infraestructura como código (IaC), definiendo las responsabilidades de cada módulo y la configuración de los entornos de despliegue.

### 4.1. Módulos de Terraform (`infra/modules/`)

Cada carpeta es un módulo reutilizable. Estos **no se ejecutan directamente**; se instancian desde los entornos en `infra/envs/`.

| Módulo            | Responsable             | Funcionalidad Principal                                                                              | Outputs Clave                                              |
| :---------------- | :---------------------- | :--------------------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| `s3_frontend/`    | Integrante S3           | Crea el bucket S3, Static Website Hosting y la bucket policy pública (`s3:GetObject`).              | `website_endpoint`                                         |
| `dynamodb/`       | Integrante DynamoDB     | Crea tablas (Users, Books, Carts, Orders), claves primarias y **GSIs**. Usa `PAY_PER_REQUEST`.      | Nombres de las tablas (`users_table_name`, `books_table_name`, etc.) |
| `iam_monitoring/` | Integrante Lambda       | Crea el **rol IAM de la Lambda**, políticas de acceso a DynamoDB y permisos de logs en CloudWatch. | `lambda_role_arn`                                          |
| `lambda_backend/` | Integrante Lambda       | Crea la **función Lambda** del backend, su Function URL (AUTH=NONE, CORS) y variables de entorno.   | `lambda_function_url`                                      |

-----

### 🔑 Definición de Outputs Clave

Los *outputs* son el mecanismo que permite a los módulos de Terraform comunicarse y pasarse información crucial para la interconexión de recursos.

| Output                                 | Definición y Propósito                                                                | Módulo Receptor (Input)                                   |
| :------------------------------------- | :------------------------------------------------------------------------------------ | :-------------------------------------------------------- |
| **`website_endpoint`**                 | URL completa del sitio estático (ej: `http://bucket.s3-website-...amazonaws.com`).    | Ninguno directo (se usa externamente en el navegador).    |
| **`users_table_name`,`books_table_name`**, etc. | Nombre físico de cada tabla DynamoDB.                                                 | `lambda_backend/` → se usan como variables de entorno.    |
| **`lambda_role_arn`**                  | ARN del rol IAM con permisos para ejecutar la Lambda y acceder a DynamoDB/CloudWatch. | `lambda_backend/` → input obligatorio al crear la Lambda. |
| **`lambda_function_url`**              | URL pública HTTP/S que invoca la función Lambda del backend.                          | Frontend (JS) → base URL para las llamadas a la API.      |

-----

### 4.2. Entornos (`infra/envs/`)

Cada entorno es un conjunto de archivos Terraform que instancia los módulos en una cuenta AWS específica, permitiendo un trabajo independiente y pruebas de integración.

| Entorno                   | Integrante                       | Alcance de Despliegue                                  | Uso Principal                                                     |
| :------------------------ | :------------------------------- | :----------------------------------------------------- | :---------------------------------------------------------------- |
| `infra/envs/Dev-app/`     | Diseñador / Desarrollador de app | Puede reutilizar módulos existentes según necesite     | Pruebas desde la **aplicación** (debug de backend y modelo contra la infra). |
| `infra/envs/Dev-s3/`      | Integrante S3                    | Instancia solo `s3_frontend`                          | Pruebas de despliegue de **frontend** y verificación del endpoint estático. |
| `infra/envs/Dev-dynamodb/`| Integrante DynamoDB              | Instancia solo `dynamodb`                             | Pruebas de **modelo de datos** (tablas, GSIs, estructura de items).         |
| `infra/envs/Dev-lambda/`  | Integrante Lambda                | Instancia `iam_monitoring` + `lambda_backend`         | Pruebas de **backend serverless** (Lambda, Function URL, permisos y logs).  |
| **`infra/envs/shared/`**  | Coordinado por el Diseñador      | **Todos los módulos** interconectados                 | **Despliegue oficial** (demo / entorno integrado de proyecto).             |

**Ejemplo de interconexión (`infra/envs/shared/`):**

```hcl
module "lambda_backend" {
  source              = "../../modules/lambda_backend"
  project_prefix      = var.project_prefix

  # Inputs desde DynamoDB
  users_table_name    = module.dynamodb.users_table_name
  books_table_name    = module.dynamodb.books_table_name
  carts_table_name    = module.dynamodb.carts_table_name
  orders_table_name   = module.dynamodb.orders_table_name

  # Input desde IAM (rol de ejecución)
  lambda_role_arn     = module.iam_monitoring.lambda_role_arn
}

```

## 5. 📄 Estructura de Archivos `.tf` (Resumen)

Los archivos estándar dentro de módulos y entornos cumplen las siguientes funciones:

* **`main.tf`**

  * *En módulos:* Define los **recursos AWS** (buckets, tablas, lambdas, roles…).
  * *En entornos:* **Instancia los módulos** y conecta sus entradas/salidas.
* **`variables.tf`**
  Define las **variables de entrada** para el módulo o entorno (ej: `project_prefix`, `aws_region`).
* **`outputs.tf`**
  Define qué información expone el módulo tras el despliegue (URLs, ARNs, IDs).
* **`providers.tf`**
  Configuración del proveedor de AWS (región, versión, perfil).
  Normalmente se define en los **entornos** (`infra/envs/...`), no en los módulos.

---

## 6. ✅ Buenas Prácticas y Flujo de Trabajo

1. **Asegurar `.gitignore`**
   El archivo debe ignorar el estado y las carpetas internas de Terraform:

   * `*.tfstate`
   * `*.tfstate.*`
   * `.terraform/`
   * `*.tfvars` (si contienen secretos)

2. **Autenticación**
   Cada integrante debe usar su propio `AWS_PROFILE` o variables de entorno para autenticarse en su cuenta.

3. **Flujo de Trabajo Individual**

   * Trabajar y ejecutar `terraform plan/apply` **únicamente** en tu carpeta de entorno personal (`infra/envs/tu-usuario`).

4. **Entorno Compartido**

   * El entorno `shared/` se reserva para el **despliegue final/integración** y debería ser gestionado principalmente por el Diseñador.

---

## 7. 🧱 Ejemplo de Estructura de Carpetas y Archivos `.tf`

Para dejarlo aún más claro, a continuación se muestran ejemplos concretos de cómo se verían:

- Un **módulo** en `infra/modules/s3_frontend/` (mantenido por el **Integrante S3**).
- Un **entorno** en `infra/envs/integrante2/` (entorno personal del **Integrante S3**).

### 7.1. Ejemplo de módulo: `infra/modules/s3_frontend/`

```text
infra/
└── modules/
    └── s3_frontend/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
````

**`main.tf` (esquema):**

```hcl
resource "aws_s3_bucket" "this" {
  bucket = "${var.project_prefix}-frontend"
}

resource "aws_s3_bucket_website_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.this.id
  policy = data.aws_iam_policy_document.public_read.json
}

data "aws_iam_policy_document" "public_read" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.this.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
  }
}
```

**`variables.tf`:**

```hcl
variable "project_prefix" {
  type        = string
  description = "Prefijo para nombrar el bucket del frontend"
}
```

**`outputs.tf`:**

```hcl
output "bucket_name" {
  value       = aws_s3_bucket.this.bucket
  description = "Nombre del bucket S3 del frontend"
}

output "website_endpoint" {
  value       = aws_s3_bucket_website_configuration.this.website_endpoint
  description = "Endpoint público del sitio estático en S3"
}
```

---

### 7.2. Ejemplo de entorno: `infra/envs/Dev-s3/`

Este entorno lo usa el **Integrante S3** para probar únicamente el despliegue del frontend en S3, de forma aislada del resto de la arquitectura.

```text
infra/
└── envs/
    └── integrante2/
        ├── main.tf
        ├── providers.tf
        └── variables.tf
```

**`providers.tf`:**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}
```

**`variables.tf`:**

```hcl
variable "aws_region" {
  type        = string
  default     = "eu-west-1"
  description = "Región AWS a utilizar"
}

variable "aws_profile" {
  type        = string
  default     = "default"
  description = "Perfil de credenciales AWS local"
}

variable "project_prefix" {
  type        = string
  default     = "libreria-integrante2"
  description = "Prefijo para nombrar recursos de este entorno"
}
```

**`main.tf`:**

```hcl
module "s3_frontend" {
  source         = "../../modules/s3_frontend"
  project_prefix = var.project_prefix
}

output "frontend_url" {
  value       = module.s3_frontend.website_endpoint
  description = "URL del sitio estático desplegado para las pruebas del Integrante S3"
}
```

---

## 8. 🚀 ¿Cómo y dónde se ejecuta Terraform?

Terraform **no se ejecuta desde los módulos**, sino desde los **entornos** en `infra/envs/`, y siempre desde la máquina local de cada integrante.

La idea es:

* Cada integrante trabaja en **su entorno personal**, alineado con su rol:

  * `infra/envs/Dev-app/` → Diseñador / Desarrollador de la app (pruebas contra la infraestructura ya creada).
  * `infra/envs/Dev-s3/` → Integrante S3 (pruebas de bucket y static website).
  * `infra/envs/Dev-dynamodb/` → Integrante DynamoDB (pruebas de tablas e índices).
  * `infra/envs/Dev-lambda/` → Integrante Lambda (pruebas de Lambda + IAM + logs).
* El entorno `infra/envs/shared/` se usa solo para el **despliegue integrado final** (demo con todos los servicios conectados).

### Ejemplo: ejecutar Terraform como Integrante S3 (`infra/envs/Dev-s3/`)

```bash
# Ubicarse en el entorno personal del Integrante S3
cd infra/envs/Dev-s3

# Inicializar Terraform (solo la primera vez o tras cambiar providers)
terraform init

# Ver qué va a crear/cambiar en S3
terraform plan

# Aplicar los cambios en la cuenta AWS configurada (perfil o variables de entorno)
terraform apply
```

### Ejemplo: desplegar el entorno integrado (`shared`)

```bash
cd infra/envs/shared

terraform init
terraform plan
terraform apply
```

> 🔐 **Importante:**
> Antes de ejecutar estos comandos, cada integrante debe tener configurado su `AWS_PROFILE` o variables de entorno (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) apuntando a **su propia cuenta de AWS**.
> 
```
```


Terraform **no se ejecuta desde los módulos**, sino desde los **entornos** en `infra/envs/`, y siempre desde tu máquina local.

La idea es:

- Cada integrante trabaja en **su entorno personal**:
  - `infra/envs/Dev-app/`
  - `infra/envs/Dev-s3/`
  - `infra/envs/Dev-lambda/`
  - `infra/envs/Dev-dynamodb/`
- El entorno `infra/envs/shared/` se usa solo para el **despliegue integrado final**.

### Ejemplo: ejecutar Terraform como integrante2

```bash
# Ubicarse en el entorno personal
cd infra/envs/Dev-s3

# Inicializar Terraform (solo la primera vez o tras cambiar providers)
terraform init

# Ver qué va a crear/cambiar
terraform plan

# Aplicar los cambios en la cuenta AWS configurada (perfil o variables de entorno)
terraform apply
````

### Ejemplo: desplegar el entorno integrado (`shared`)

```bash
cd infra/envs/shared

terraform init
terraform plan
terraform apply
```

> 🔐 **Importante:**

> Antes de ejecutar estos comandos, cada integrante debe tener configurado su `AWS_PROFILE` o variables de entorno (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) apuntando a **su propia cuenta de AWS**.
