# README — Orden de ejecución (Terraform + Deploy)

Este proyecto se despliega en AWS usando Terraform, y requiere seguir un **orden específico** para que la infraestructura y el código queden conectados correctamente (Cognito → Backend Lambda → Frontend S3).

> **Regla general:** en cada carpeta `envs/*` se debe ejecutar primero `terraform init` (una vez por carpeta) antes de `terraform apply`.

---

## 0) Requisitos previos

* AWS CLI configurado y con credenciales válidas.
* Terraform instalado.
* Node.js instalado (para build del backend).
* Tener un nombre de bucket S3 **único globalmente** (no se puede repetir).

---

## 1) Desplegar Cognito (Autenticación)

1. Ir a:

   ```bash
   cd infra/envs/Dev-app
   terraform init
   terraform apply
   ```

2. Guardar los outputs (los vas a necesitar después), especialmente:

   * `COGNITO_USER_POOL_ID`
   * `COGNITO_CLIENT_ID`
   * `COGNITO_CLIENT_SECRET` (si aplica)

---

## 2) Desplegar DynamoDB (Base de datos)

1. Ir a:

   ```bash
   cd ../Dev-dynamodb
   terraform init
   terraform apply
   ```

2. Verifica/guarda los nombres de tablas creadas (Books, Carts, Orders, Users) si el módulo los imprime.

---

## 3) Definir la URL pública del Frontend (S3 Website)

Cada integrante debe usar un bucket **único**, por ejemplo:

* `mi-app-dev-libreria-aws-tu-nombre-1234`

La URL típica se verá así:

```
http://<bucket>.s3-website-us-east-1.amazonaws.com
```

---

## 4) Configurar variables del Backend (.env)

Editar:
`app/backend/.env`

Actualizar:

* **CORS_ORIGINS** con tu URL del S3 (y opcionalmente localhost):

  ```
  CORS_ORIGINS=http://<bucket>.s3-website-us-east-1.amazonaws.com,http://localhost:5173
  ```

* **Credenciales de Cognito** con lo obtenido en el paso 1:

  ```
  COGNITO_REGION=us-east-1
  COGNITO_USER_POOL_ID=...
  COGNITO_CLIENT_ID=...
  COGNITO_CLIENT_SECRET=...
  ```

* **Tablas DynamoDB** (si corresponde):

  ```
  DB_PROVIDER=DynamoAWS
  TABLE_BOOKS=eugenio-books
  TABLE_CARTS=eugenio-carts
  TABLE_ORDERS=eugenio-orders
  TABLE_USERS=eugenio-users
  ```

---

## 5) Build y empaquetado del Backend (Lambda)

En `app/backend` ejecutar:

```bash
cd app/backend
npm install
npm ci
npm run build:lambda
npm run zip:lambda
```

Asegúrate de que se genere:

* `app/backend/lambda.zip`

---

## 6) Configurar Terraform del Backend (Dev-lambda)

Editar:
`infra/envs/Dev-lambda/terraform.tfvars`

Actualizar:

* Credenciales Cognito (las tuyas)
* `lambda_role_arn` si estás usando un rol existente
* (si aplica) nombres de tablas o variables relacionadas

Luego desplegar:

```bash
cd infra/envs/Dev-lambda
terraform init
terraform apply
```

✅ Guarda el output:

* `api_url`

---

## 7) Conectar el Frontend al Backend (proxy.mjs)

Editar:
`app/frontend/dist_s3/libreria/js/model/proxy.mjs`

Cambiar la URL base por la entregada por Lambda (`api_url`) y **agregar `/api` al final**.

Ejemplo:

```js
const BASE_URL = "https://xxxx.execute-api.us-east-1.amazonaws.com/api";
```

> Importante: si no agregas `/api`, las rutas no coincidirán.

---

## 8) Desplegar el Frontend a S3 (Dev-s3)

Finalmente, subir el contenido del frontend:

```bash
cd infra/envs/Dev-s3
terraform init
terraform apply
```

Luego prueba tu web en:

```
http://<bucket>.s3-website-us-east-1.amazonaws.com
```

---

## Notas importantes (errores comunes)

* **404 en S3 Website:** normalmente significa que no se subió `index.html` a la raíz del bucket (revisar `upload_dir` y build).
* **CORS bloqueado:** asegúrate de que `cors_allow_origins` (API Gateway) y `CORS_ORIGINS` (.env backend) incluyan exactamente tu URL del S3 con `http://`.
* **DynamoDB “couldn’t find resource”:** el nombre de tabla en Terraform no coincide con el nombre real en AWS o estás en otra región/cuenta.

