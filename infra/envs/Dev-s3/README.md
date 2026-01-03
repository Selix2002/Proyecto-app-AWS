
# Entorno Dev-s3 (Frontend en S3)

Despliega el bucket S3 para servir el frontend como **static website**.

## Requisitos
- Terraform >= 1.5
- AWS CLI configurado (credenciales con permisos S3)
- (Opcional) Node.js para compilar el frontend

## Despliegue
```bash
cd infra/envs/Dev-s3
terraform init
terraform apply -auto-approve
