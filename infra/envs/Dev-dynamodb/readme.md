# DynamoDB (Entorno DEV)

Este directorio contiene la configuración de Terraform para desplegar la capa de datos de la librería en el entorno de desarrollo (**Dev**). Su objetivo es provisionar las tablas DynamoDB necesarias aislando la infraestructura de datos del resto de la aplicación.

## Estructura de Archivos

A continuación se detalla la función de cada fichero en este directorio:

### 1. `main.tf` (Orquestador principal)
Es el archivo que ejecuta la lógica.
* **Provider AWS:** Configura la conexión con AWS en la región `us-east-1`.
* **Llamada al Módulo:** Invoca al código reutilizable situado en `../../modules/dynamodb`, pasándole el prefijo del proyecto.
* **Output local:** Muestra directamente el nombre de la tabla de libros para una verificación rápida.

### 2. `variables.tf` (Definición de entradas)
Define qué datos necesita este código para funcionar.
* `project_prefix`: Cadena de texto para personalizar los nombres de los recursos.
* `env`: Cadena para definir el entorno de trabajo.
* `aws_region`: Región de AWS, establecida por defecto en `us-east-1`.

### 3. `terraform.tfvars` (Valores reales)
Aquí es donde asignamos los valores específicos para tu despliegue:
* `env`: Configurado como `"dev"`.
* `project_prefix`: Configurado como `"eugenio"`.
* `aws_region`: Configurado como `"us-east-1"`.

### 4. `outputs.tf` (Datos de salida)
Exporta un mapa estructurado llamado `tables` con la información de las tablas de usuarios, libros, carritos y órdenes. Para cada una, devuelve:
* **name:** El nombre exacto de la tabla creada por el módulo.
* **arn:** El identificador único (ARN) necesario para las políticas de seguridad IAM.

---

## Guía de despliegue

Primero de todo, hay que asegurarse de tener las credenciales de AWS Academy configuradas en el equipo local donde se realice el despliegue.

### 1. Inicializar
Descarga los plugins de AWS y prepara el directorio de trabajo:
`terraform init`

### 2. Planificar
Genera una vista previa técnica de los cambios. Terraform comparará el código con lo que ya existe en AWS y te dirá qué tablas va a crear sin aplicar cambios todavía.
`terraform plan`

### 3. Aplicar
Ejecuta la creación real de los recursos. Al ejecutarlo, Terraform te pedirá una confirmación manual (escribe `yes`).

---
## Limpieza
Para evitar el consumo de créditos en AWS Academy, cuando no se esté utilizando se recomienda eliminar toda la infraestructura creada con el comando:
`terraform destroy`
