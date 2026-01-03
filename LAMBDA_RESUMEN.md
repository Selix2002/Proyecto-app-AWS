# Resumen: Implementación de Lambda para Backend

## 📋 Objetivo
Migrar el backend Express (Node.js) a **AWS Lambda** con **Function URL** pública, manteniendo la misma API REST y soporte para **DynamoDB**.

---

## ✅ Pasos Completados

### 1. **Análisis de Arquitectura**
- ✅ Leído README del proyecto y documentación
- ✅ Confirmado que backend ya soporta DynamoDB (`model/db/dynamo-aws.mjs`)
- ✅ Identificadas dependencias: Express, serverless-http, AWS SDK v3

### 2. **Creación de Módulos Terraform**

#### **Módulo IAM (`infra/modules/iam_monitoring/`)**
Creó rol IAM con políticas para:
- ✅ DynamoDB: get, put, update, delete, scan, query
- ✅ CloudWatch Logs: crear y escribir logs
- ✅ Cognito: autenticar usuarios

**Archivos creados:**
- `main.tf`: Rol IAM + políticas
- `variables.tf`: Variables de entrada
- `outputs.tf`: ARN del rol

#### **Módulo Lambda (`infra/modules/lambda_backend/`)**
Configura Lambda Function + Function URL + CloudWatch Logs

**Archivos creados:**
- `main.tf`: Lambda resource, Function URL, Log Group
- `variables.tf`: Variables para tablas DynamoDB, Cognito, CORS, runtime
- `outputs.tf`: Lambda ARN, Function URL, Log Group name

**Configuración Lambda:**
```hcl
handler             = "handler.handler"          # ✅ Corregido de "server.handler"
runtime             = "nodejs18.x"
timeout             = 30 segundos
memory_size         = 512 MB
```

### 3. **Creación de Entornos Terraform**

#### **Dev-lambda (`infra/envs/Dev-lambda/`)**
Instancia los módulos IAM + Lambda para ambiente de desarrollo

**Archivos creados:**
- `main.tf`: Llama módulos con variables
- `variables.tf`: Define vars del entorno
- `outputs.tf`: Exporta Lambda URL, ARN, Log Group
- `terraform.tfvars`: Valores específicos (tablas DDB, Cognito, CORS)

**Parámetros principales:**
```hcl
project_prefix       = "eugenio"
lambda_runtime       = "nodejs18.x"
lambda_timeout       = 30
lambda_memory_size   = 512
aws_region           = "us-east-1"
cors_origins         = "http://localhost:5173"  # Actualizar con S3 frontend URL
```

#### **Shared (`infra/envs/shared/`)**
Reservado para integración final (DynamoDB + S3 + Lambda)

**Archivos creados:**
- `main.tf`: Integrará todos los módulos
- `variables.tf`: Variables compartidas
- `terraform.tfvars`: Valores comunes

### 4. **Build y Packaging del Lambda**

#### **Script NPM (`app/backend/package.json`)**
```json
{
  "scripts": {
    "build:lambda": "esbuild src/lambda/handler.mjs --bundle --platform=node --format=cjs --target=node20 --outfile=dist/handler.js --sourcemap",
    "zip:lambda": "rm -f lambda.zip && cd dist && zip -r ../lambda.zip .",
    "package:lambda": "npm run clean:lambda && npm ci && npm run build:lambda && npm run zip:lambda"
  }
}
```

**Pasos ejecutados:**
```bash
cd app/backend

# Build con esbuild (transpila ESM → CJS, bundlea dependencias)
npm run build:lambda
# Output: dist/handler.js (~2.6 MB) + sourcemap

# Zip manual en PowerShell (en Windows rm/zip no existen)
Compress-Archive -Path .\dist\* -DestinationPath .\lambda.zip -Force
# Output: lambda.zip (~700 KB)
```

**Ubicación final:** `C:\Users\nabel\Documents\AWS\Proyecto-app-AWS\app\backend\lambda.zip`

### 5. **Correcciones y Ajustes**

#### **a) Handler Name (Fixed)**
- **Problema:** Lambda buscaba `server.handler` (no existía)
- **Solución:** Cambiar a `handler.handler` para coincdir con `dist/handler.js`
- **Archivo:** `infra/modules/lambda_backend/main.tf` línea 22

#### **b) CORS Methods (Fixed)**
- **Problema:** AWS Function URL no acepta `OPTIONS` en `allow_methods` (validación de API)
- **Solución:** Remover `OPTIONS`, mantener `["GET", "POST", "PUT", "DELETE", "PATCH"]`
- **Archivo:** `infra/modules/lambda_backend/main.tf` línea 40

#### **c) AWS Region Variable (Fixed)**
- **Problema:** Deprecación de `data.aws_region.current.name`
- **Solución:** Reemplazar con `variable.aws_region` (default: "us-east-1")
- **Archivo:** `infra/modules/lambda_backend/variables.tf` + `main.tf`

### 6. **Despliegue en AWS**

```bash
cd infra/envs/Dev-lambda

# Inicializar Terraform
terraform init

# Revisar plan
terraform plan
# Muestra: +7 recursos (IAM role, 5 policies, Lambda, Function URL, CloudWatch Log Group)

# Aplicar cambios
terraform apply
# ✅ Aplicado exitosamente
```

**Recursos creados:**
- ✅ **Lambda Function:** `eugenio-backend`
- ✅ **Function URL:** `https://acy2i6i7jntaharksyj6qafa5q0wvzgs.lambda-url.us-east-1.on.aws/`
- ✅ **IAM Role:** `eugenio-lambda-execution-role`
- ✅ **CloudWatch Logs:** `/aws/lambda/eugenio-backend`

---

## 📊 Estado Actual

| Componente | Estado | Detalles |
|-----------|--------|---------|
| Lambda Function | ✅ Creada | Código compilado y zippeado |
| Function URL | ✅ Pública | Sin autenticación, CORS configurado |
| IAM Permissions | ✅ Configurado | DynamoDB, CloudWatch, Cognito |
| CloudWatch Logs | ✅ Activo | 7 días retención |
| DynamoDB Tables | ❌ Pendiente | Responsabilidad de compañero (Dev-dynamodb) |
| S3 Frontend | ❌ Pendiente | No configurado aún |

---

## 🔄 Variables de Entorno (Lambda)

```hcl
DB_PROVIDER              = "DynamoAWS"
DDB_TABLE_BOOKS          = "eugenio-books"
DDB_TABLE_CARTS          = "eugenio-carts"
DDB_TABLE_ORDERS         = "eugenio-orders"
DDB_TABLE_USERS          = "eugenio-users"
DDB_USERS_EMAIL_INDEX    = "email-index"
DDB_ORDERS_USERID_INDEX  = "userId-index"
CORS_ORIGINS             = "http://localhost:5173"
COGNITO_REGION           = "us-east-1"
COGNITO_USER_POOL_ID     = "<pool-id>"
COGNITO_CLIENT_ID        = "<client-id>"
COGNITO_CLIENT_SECRET    = "<secret>"
AWS_REGION               = "us-east-1"
```

---

## 🧪 Validación (Pasos Próximos)

### Paso 1: Crear Tablas DynamoDB
```bash
# Compañero ejecuta:
cd infra/envs/Dev-dynamodb
terraform init
terraform apply
```

### Paso 2: Test API
```bash
# Verificar tablas creadas
aws dynamodb list-tables --region us-east-1

# Test endpoint
curl "https://acy2i6i7jntaharksyj6qafa5q0wvzgs.lambda-url.us-east-1.on.aws/api/libros"
# Esperado: [] (lista vacía o datos)

# Test POST
curl -X POST "https://acy2i6i7jntaharksyj6qafa5q0wvzgs.lambda-url.us-east-1.on.aws/api/libros" \
  -H "Content-Type: application/json" \
  -d '{"isbn":"123","titulo":"Test","autores":"Author","stock":10,"precio":19.99}'
```

### Paso 3: Revisar Logs
```bash
aws logs tail "/aws/lambda/eugenio-backend" --follow --since 5m
```

---

## 📁 Estructura de Archivos Modificados

```
infra/
├── modules/
│   ├── iam_monitoring/
│   │   ├── main.tf          (NEW)
│   │   ├── variables.tf      (NEW)
│   │   └── outputs.tf        (NEW)
│   └── lambda_backend/
│       ├── main.tf          (NEW - handler: "handler.handler", CORS fix)
│       ├── variables.tf      (NEW - aws_region var added)
│       └── outputs.tf        (NEW)
└── envs/
    ├── Dev-lambda/
    │   ├── main.tf          (NEW)
    │   ├── variables.tf      (NEW)
    │   ├── outputs.tf        (NEW)
    │   └── terraform.tfvars  (NEW)
    └── shared/
        ├── main.tf          (NEW)
        ├── variables.tf      (NEW)
        ├── outputs.tf        (NEW)
        └── terraform.tfvars  (NEW)

app/backend/
├── dist/
│   ├── handler.js           (NEW - esbuild output)
│   └── handler.js.map       (NEW - sourcemap)
└── lambda.zip               (NEW - zipped artifact)
```

---

## 🚀 Próximos Pasos (Equipo)

1. **Compañero (DynamoDB):** Ejecutar `terraform apply` en `Dev-dynamodb`
2. **Compañero (Frontend):** Implementar S3 module e actualizar `CORS_ORIGINS`
3. **Todos:** Validar endpoints una vez DynamoDB esté operativo
4. **Todos:** Integrar autenticación Cognito y pruebas end-to-end

---

## 📝 Notas Importantes

- **Handler:** Debe ser `handler.handler` porque esbuild output es `dist/handler.js`
- **CORS:** Configurado en Function URL y en Express app.js (redundancia intencional)
- **DynamoDB:** Multi-tabla (cada service pasa TableName en operaciones)
- **Cognito:** Variables inyectadas en Lambda; frontend necesita SDK para login
- **Costo:** DynamoDB on-demand pagará por uso; Lambda pagará por invocaciones (mínimo si idle)

---

## 📚 Archivos de Referencia

- Backend code: `app/backend/` (no modificado, solo compilado)
- Handler: `app/backend/src/lambda/handler.mjs` (serverless-http wrapper)
- Express app: `app/backend/src/app.mjs` (CORS + rutas)
- DynamoDB client: `app/backend/model/db/dynamo-aws.mjs` (multi-tabla)
- Services: `app/backend/model/services/` (libroServices, userServices, etc.)

---

**Completado por:** GitHub Copilot  
**Fecha:** 3 de enero de 2026  
**Rama:** master
