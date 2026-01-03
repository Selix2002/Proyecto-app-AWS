
# Módulo `s3_frontend`

Crea un bucket S3 para **hosting estático** del frontend con:
- Website hosting (index/error)
- Política pública de `s3:GetObject`
- CORS opcional
- Outputs con `website_endpoint` y `website_domain`

> ⚠️ El endpoint de S3 Website no usa HTTPS. Para HTTPS y mejores cachés, usar CloudFront (opcional en producción).

## Variables
- `bucket_name` (string, **requerido**): nombre globalmente único.
- `enable_static_website` (bool, default `true`)
- `index_document` (string, default `index.html`)
- `error_document` (string, default `error.html`)
- `enable_cors` (bool, default `true`)
- `cors_rules` (list(object), default permite `GET/HEAD` desde `*`)
- `force_destroy` (bool, default `false`)
- `tags` (map(string), default `{}`)

## Outputs
- `bucket_name`, `bucket_arn`
- `website_endpoint`, `website_domain`

## Notas
- Mantiene **ACLs deshabilitadas** (`BucketOwnerEnforced`).
- Desactiva **Public Access Block** para permitir política pública.
