# 🧠 Backend – API Librería

Este directorio contiene el **backend del sistema de librería**, implementado como una **API REST** construida con **Node.js + Express**, utilizando **MongoDB (Mongoose)** como motor de persistencia.

El backend es responsable de:
- Gestión de usuarios (clientes, administradores)
- Autenticación y autorización mediante JWT
- Gestión de libros
- Carro de compras
- Facturación
- Persistencia de datos y reglas de negocio

> ⚠️ **Importante:**  
> Este backend **NO utiliza DynamoDB**.  
> Toda la persistencia está basada en **MongoDB + Mongoose**.

---

## 🧱 Arquitectura general

El backend sigue una **arquitectura por capas**, separando claramente:

1. **API / Rutas (Express)**
2. **Modelo de dominio (`model/`)**
3. **Servicios de persistencia (Mongoose)**
4. **Base de datos (MongoDB)**

```text
Request HTTP
   ↓
Express (app.mjs)
   ↓
model (model.mjs)
   ↓
services (Mongoose)
   ↓
MongoDB
````

Esto permite:

* Mantener la lógica de negocio desacoplada de Express
* Cambiar la tecnología de persistencia en el futuro
* Facilitar tests y mantenimiento

---

## 📁 Estructura principal

```text
backend/
├── src/
│   ├── app.mjs          # Definición de la API y rutas
│   ├── db.mjs           # Conexión a MongoDB
│   ├── seeder.mjs       # Datos iniciales
│   ├── resetDB.mjs      # Reset completo de la base
│   └── model/
│       ├── model.mjs    # Fachada del modelo de dominio
│       ├── services/    # Lógica de acceso a datos (Mongoose)
        └── schema/      # Estrucutra interna de cada colección.(Users, Libros, etc)
├── .env
├── package.json
└── README.md
```

---

## 🔌 Arranque del servidor

El punto de entrada del backend:

```js
import { connectDB } from "./src/db.mjs";
import { app } from "./src/app.mjs";
const PORT = process.env.PORT;

await connectDB();

app.listen(PORT, () => {
    console.log(`Static HTTP server listening on ${PORT}`);
});
```

Flujo de inicio:

1. Carga de variables de entorno (`dotenv`)
2. Conexión a MongoDB (`connectDB`)
3. Inicialización de Express
4. Escucha en el puerto configurado

---

## 🌱 Base de datos y entornos

### Variables de entorno (`.env`)

```env
MONGO_URL=mongodb://127.0.0.1:27017/libreria
MONGO_URL_TEST=mongodb://localhost:27017/libreria_test
PORT=3000
JWT_SECRET=supersecretkey
```

### Selección automática de base

```js
const MONGO_URL =
  process.env.NODE_ENV === "test"
    ? process.env.MONGO_URL_TEST
    : process.env.MONGO_URL;
```

Esto permite:

* Separar **desarrollo** y **tests**
* Evitar contaminar datos reales

---

## 🔐 Autenticación y autorización (JWT)

La autenticación se implementa usando:

* `passport`
* `passport-jwt`
* Tokens JWT firmados con `JWT_SECRET`

### Flujo de autenticación

1. Usuario envía credenciales (`email`, `password`, `rol`)
2. Se validan contra la base de datos
3. Se genera un **JWT**
4. El frontend almacena el token
5. Las rutas protegidas usan `passport.authenticate("jwt")`

Ejemplo:

```http
Authorization: Bearer <token>
```

---

## 🧩 Roles del sistema

El sistema maneja **roles explícitos**:

* `admin`
* `cliente`

Las rutas validan:

* Existencia del usuario
* Rol correcto
* Permisos (por ejemplo, acceso a otros usuarios)

Ejemplo de control de acceso:

```js
if (req.user.rol !== "admin" && req.user._id !== id) {
  return res.status(403).json({ message: "Acceso no autorizado" });
}
```

---

## 📚 Modelo de dominio (`model/`)

El archivo `model.mjs` actúa como una **fachada**.

Define una API uniforme para el backend:

```js
model.users.addUser(...)
model.libros.getLibros()
model.carts.add(...)
model.facturas.createFromCart(...)
```

Internamente, cada módulo delega en un **service** específico basado en Mongoose.

Ventajas:

* Express no conoce Mongoose directamente
* Facilita cambios futuros (ej: otro motor de datos)
* Código más testeable

---

## 🛒 Flujo del carro de compras

1. Cada cliente tiene un carro asociado
2. El carro se persiste en MongoDB
3. Operaciones disponibles:

   * Agregar item
   * Cambiar cantidad
   * Eliminar item
   * Vaciar carro

El carro es la base para la facturación.

---

## 🧾 Flujo de facturación

1. Cliente tiene un carro con ítems
2. Se valida que el carro no esté vacío
3. Se validan datos obligatorios (DNI, dirección, etc.)
4. Se crea una **Factura**
5. Se limpia el carro

La factura queda persistida y puede ser consultada posteriormente.

---

## 🌱 Seeder y reset de base

### Reset de base de datos

```js
await resetDatabase();
```

Elimina completamente la base activa (uso controlado).

### Seeder

```js
await seed();
```

Inserta:

* Libros de ejemplo
* Usuario admin
* Usuario cliente

Útil para:

* Desarrollo
* Demos
* Tests manuales

---

## 🌐 CORS y frontend

El backend está configurado para aceptar peticiones desde:

```text
http://localhost:5173
```

Esto permite integración directa con Vite en desarrollo.

---

## ❌ Notas importantes

* ❌ No usa DynamoDB
* ❌ No es serverless
* ❌ No hay microservicios
* ✅ Arquitectura monolítica clara
* ✅ Separación de responsabilidades
* ✅ JWT correctamente implementado