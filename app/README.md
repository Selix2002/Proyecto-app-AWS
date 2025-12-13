# 📚 Proyecto Librería – Frontend + Backend

Este repositorio contiene un proyecto web dividido en **backend** y **frontend**, gestionado mediante un `justfile` para facilitar el desarrollo local.

La arquitectura está pensada para mantener ambos componentes **desacoplados**, pero con un arranque sencillo mediante un solo comando.

---

## 🧱 Estructura del proyecto

```text
app
├── backend/        # API / lógica de servidor
├── frontend/       # Aplicación web (Vite)
├── justfile        # Comandos de desarrollo
└── README.md
````

---

## 🛠️ Requisitos previos

Asegúrate de tener instalado:

* **Node.js** (recomendado: LTS)
* **npm**
* **just** (command runner)

### Instalar `just` (Ubuntu / Debian)

```bash
sudo apt install just
```

Verifica la instalación:

```bash
just --version
```

---

## 📦 Instalación de dependencias

Desde la **raíz del proyecto**, ejecuta:

```bash
just install
```

Este comando instala las dependencias de:

* `backend/`
* `frontend/`

> ⚠️ Este paso solo es necesario la primera vez o cuando cambian las dependencias.

---

## ▶️ Arrancar el proyecto en desarrollo

Para levantar **backend y frontend en paralelo**:

```bash
just dev
```

Esto ejecuta:

* `npm run start` en `backend/`
* `npm run dev` en `frontend/`

### Servicios levantados

* **Frontend (Vite):**
  [http://localhost:5173](http://localhost:5173)

* **Backend (API):**
  [http://localhost:3000](http://localhost:3000)

El frontend se comunica con el backend mediante un **proxy configurado en Vite**, por lo que las peticiones se realizan a rutas `/api/...`.

---

## ⚙️ Comandos disponibles

Desde la raíz del proyecto:

```bash
just backend    # Levanta solo el backend
just frontend   # Levanta solo el frontend
just dev        # Levanta ambos (modo desarrollo)
just install    # Instala dependencias de front y back
```

---

## 🧪 Notas de desarrollo

* Backend y frontend tienen **dependencias independientes**.
* No se deben compartir `node_modules`.
* El uso de `just` permite un flujo de trabajo simple y reproducible.
* Pensado para escalar a entornos de producción (S3, API separada, etc.).

---

Cualquier duda sobre la estructura o los comandos, revisa el `justfile` o la documentación interna de cada carpeta.