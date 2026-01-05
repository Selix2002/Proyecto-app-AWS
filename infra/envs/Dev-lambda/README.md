# IMPORTANTE
En el archivo terraform.tfvars, cambiar las variables de cognito y AIM por las que obtengando al
ejecutar terraform apply en el entorno "Dev-app".

# 📚Crear lambda.zip

Para crear este archivo, necesario para la configuración de lambda, se deben usar los comandos:
```bash
npm ci            
npm run build:lambda
npm run zip:lambda
```
Esto dentro de la carpeta "app/backend". Es necesario tener node instalado previamente y lanzar el comando "npm install" dentro de la misma carpeta ("app/backend").