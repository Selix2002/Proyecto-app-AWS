# 🖥️ Frontend – Aplicación Librería

Este directorio contiene el **frontend de la aplicación de librería**, construido como una **SPA ligera en JavaScript** y servido en desarrollo mediante **Vite**.

El objetivo de este frontend es **orquestar el flujo de datos entre la interfaz y el backend**, manteniendo:
- Separación clara de responsabilidades
- Centralización de llamadas HTTP
- Gestión explícita de sesión y autenticación


---

## 🧱 Visión general del flujo de datos

El frontend sigue un flujo **unidireccional y controlado**:

```text
Usuario
  ↓
Presenter (pantalla actual)
  ↓
Proxy (HTTP / API)
  ↓
Backend (/api/*)
  ↓
Respuesta JSON
  ↓
Proxy
  ↓
Presenter
  ↓
Vista
````

No existen llamadas directas al backend fuera del **Proxy**.

---

## 📁 Estructura relevante

```text
frontend/
└── public/
    └── libreria/
        └── js/
            ├── main.mjs              # Bootstrap y registro de rutas
            ├── model/
            │   └── proxy.mjs         # Único punto de acceso a la API
            ├── commons/
            │   ├── router.mjs        # Resolución de rutas (no modificar)
            │   └── libreria-session.mjs # Gestión de sesión y JWT
            └── components/
                └── */                # Presenters por rol y vista
```

---

## 🚀 Punto de entrada: `main.mjs`

El archivo `main.mjs` es el **bootstrap de la aplicación**.

Responsabilidades:

* Inicializar la sesión (`LibreriaSession`)
* Registrar rutas
* Asociar cada ruta a su **Presenter**
* Delegar el control al router

Ejemplo conceptual:

```js
LibreriaSession.init();
router.register(ruta, presenter, rol);
router.handleLocation();
```

👉 **No se realizan llamadas HTTP aquí**.

---

## 🔄 Presenters: consumidores del Proxy

Cada pantalla tiene un **Presenter** responsable de:

* Pedir datos al backend
* Interpretar respuestas
* Decidir acciones de navegación
* Actualizar la vista correspondiente

📌 **Regla clave:**
Los Presenters **NO usan `fetch` directamente**.
Toda comunicación pasa por el **Proxy**.

---

## 🌐 Proxy: único acceso al backend

El archivo `model/proxy.mjs` es el **núcleo del flujo de datos**.

### Responsabilidades del Proxy

* Centralizar todas las llamadas HTTP (`fetch`)
* Normalizar URLs (`/api/...`)
* Adjuntar automáticamente el JWT
* Manejar errores comunes
* Traducir respuestas a objetos JS

Ejemplo:

```js
await proxy.getLibros();
await proxy.autenticar({ email, password, rol });
```

Si una llamada no existe en el Proxy, **no debe hacerse desde otro lugar**.

---

## 🔐 Autenticación y sesión

La sesión se maneja mediante `LibreriaSession`.

### Flujo de autenticación

1. Presenter llama a:

   ```js
   proxy.autenticar(...)
   ```
2. El backend devuelve `{ token }`
3. El token se guarda en `LibreriaSession`
4. El Proxy añade automáticamente:

   ```http
   Authorization: Bearer <token>
   ```
5. Las rutas privadas quedan habilitadas

Si el backend responde **401**, el Proxy:

* Limpia la sesión
* Notifica al usuario
* Fuerza reautenticación

---

## 🧭 Roles y navegación

El frontend distingue **tres roles** principales:

* Invitado
* Cliente
* Admin

Cada ruta registrada en `main.mjs` define:

* Qué Presenter se carga
* Qué rol puede acceder

El router impide acceder a rutas que no correspondan al rol activo.

---

## 📦 Tipos de datos gestionados

El Proxy encapsula el acceso a:

* Usuarios / autenticación
* Libros
* Clientes
* Administradores
* Carro de compras
* Facturas

Cada método del Proxy corresponde **1:1** con una ruta del backend.

Ejemplo:

```text
proxy.getLibros()        → GET    /api/libros
proxy.addLibro()         → POST   /api/libros
proxy.facturarCompra()   → POST   /api/facturas
```

---

## 🔁 Manejo de errores

El Proxy centraliza el manejo de errores:

* Respuestas HTTP no exitosas
* Errores de autenticación
* Mensajes del backend (`error`, `message`)

Esto evita duplicar lógica de control en los Presenters.

---

## 🔌 Comunicación con el backend (Vite Proxy)

En desarrollo, el frontend **NO llama directamente** a `localhost:3000`.

Vite redirige automáticamente:

```text
/api/* → http://localhost:3000/api/*
```

Configuración:

```js
server: {
  proxy: {
    "/api": {
      target: "http://localhost:3000",
      changeOrigin: true
    }
  }
}
```

Esto:

* Evita problemas de CORS
* Permite usar rutas relativas
* Simplifica despliegue

---

## ❌ Qué NO hacer en este frontend

* ❌ No usar `fetch` fuera del Proxy
* ❌ No acceder directamente a `localStorage` fuera de `LibreriaSession`
* ❌ No llamar a `/api` desde vistas
* ❌ No mezclar lógica de negocio en componentes visuales

---

## ✅ Resumen

* El **Proxy** es el corazón del flujo de datos
* Los **Presenters** consumen datos, no gestionan HTTP
* La **sesión** se maneja de forma centralizada
* El frontend es un **orquestador**, no un motor de negocio
* La API define la verdad del sistema

Este diseño prioriza **claridad, mantenibilidad y control del flujo de datos** sobre complejidad innecesaria.
