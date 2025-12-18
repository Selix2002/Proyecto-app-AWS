// src/app/app.mjs
import express from "express";
import path from "path";
import url from "url";
import passport from "passport";
import { Strategy as JWTStrategy, ExtractJwt as ExtractJWT } from "passport-jwt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

import { model } from "../model/model.mjs";

const STATIC_DIR = url.fileURLToPath(new URL(".", import.meta.url));

export const app = express();

// ================== CORS ==================
const allowed = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
  
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl/postman
    return allowed.includes(origin) ? cb(null, true) : cb(new Error("CORS blocked"));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

app.options("*", cors());
// ================== MIDDLEWARES ==================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== JWT / PASSPORT ==================
const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: SECRET_KEY,
    },
    async (jwtPayload, done) => {
      try {
        const user = await model.users.getById(jwtPayload.id);
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

app.use(passport.initialize());

const requireAuth = passport.authenticate("jwt", { session: false });



// ================== HELPERS ==================
function safeUser(u) {
  return u ?? null;
}

async function getUsersByRole(rol) {
  return model.users.getByRole(rol);
}

async function removeUsersByRole(rol) {
  return model.users.removeByRole(rol);
}

async function findUserByIdAndRole(id, rol) {
  if (!id) return null;
  const u = await model.users.getById(id);
  if (!u || u.rol !== rol) return null;
  return u;
}

async function removeUserByIdAndRole(id, rol) {
  return model.users.removeByIdAndRole(id, rol);
}

async function getAllInvoices() {
  return model.facturas.getAllGlobal();
}

// ================== LIBROS ==================

app.get("/api/libros", async (req, res) => {
  const { isbn, titulo } = req.query;

  try {
    const libros = await model.libros.getLibros();

    if (isbn) {
      const libro = libros.find((l) => String(l.isbn) === String(isbn));
      if (!libro) return res.status(404).json({ error: "Libro no encontrado" });
      return res.json(libro);
    }

    if (titulo) {
      const libro = libros.find((l) => String(l.titulo) === String(titulo));
      if (!libro) return res.status(404).json({ error: "Libro no encontrado" });
      return res.json(libro);
    }

    res.json(libros);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// GET /api/libros/:id  (id = isbn)
app.get("/api/libros/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });
  console.log("Obteniendo libro con id:", id);
  try {
    const libro = await model.libros.getLibroPorId(id);
    if (!libro) return res.status(404).json({ error: "Libro no encontrado" });
    res.json(libro);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// POST /api/libros
app.post("/api/libros", async (req, res) => {
  try {
    const libro = await model.libros.addLibro(req.body);
    res.status(201).json(libro);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al crear libro" });
  }
});

// PUT /api/libros -> replaceAll(array)
app.put("/api/libros", async (req, res) => {
  try {
    const arr = Array.isArray(req.body) ? req.body : [];
    const librosFinales = await model.libros.replaceAll(arr);
    res.json(librosFinales);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al reemplazar libros" });
  }
});

// DELETE /api/libros -> removeAll()
app.delete("/api/libros", async (req, res) => {
  try {
    await model.libros.removeAll();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al eliminar libros" });
  }
});

// PUT /api/libros/:id
app.put("/api/libros/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(500).json({ error: "ID no definido" });

  try {
    const libro = await model.libros.getLibroPorId(id);
    if (!libro) return res.status(404).json({ error: "Libro no encontrado" });

    const actualizado = await model.libros.updateLibro(id, req.body);
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al actualizar libro" });
  }
});

// DELETE /api/libros/:id
app.delete("/api/libros/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  try {
    await model.libros.removeLibro(id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    if (err.message === "Libro no encontrado") {
      res.status(404).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message ?? "Error al eliminar libro" });
    }
  }
});

// ================== CLIENTES ==================

app.get("/api/clientes", async (req, res) => {
  const { email, dni } = req.query;

  try {
    if (email) {
      const u = await model.users.findByEmail(email);
      if (!u || u.rol !== "cliente")
        return res.status(404).json({ error: "Cliente no encontrado" });
      return res.json(safeUser(u));
    }

    if (dni) {
      const u = await model.users.findByDni(dni);
      if (!u || u.rol !== "cliente")
        return res.status(404).json({ error: "Cliente no encontrado" });
      return res.json(safeUser(u));
    }

    const clientes = await getUsersByRole("cliente");
    res.json(clientes.map(safeUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// GET /api/clientes/:id
app.get("/api/clientes/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  try {
    const u = await findUserByIdAndRole(id, "cliente");
    if (!u) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(safeUser(u));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// POST /api/clientes
app.post("/api/clientes", async (req, res) => {
  try {
    const data = { ...req.body, rol: "cliente" };
    const user = await model.users.addUser(data);
    res.status(201).json(safeUser(user));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al crear cliente" });
  }
});

// PUT /api/clientes
app.put("/api/clientes", async (req, res) => {
  try {
    const arr = Array.isArray(req.body) ? req.body : [];

    await removeUsersByRole("cliente");

    const creados = [];
    for (const raw of arr) {
      const data = { ...raw, rol: "cliente" };
      const user = await model.users.addUser(data);
      creados.push(safeUser(user));
    }

    res.json(creados);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al reemplazar clientes" });
  }
});

// DELETE /api/clientes
app.delete("/api/clientes", async (req, res) => {
  try {
    await removeUsersByRole("cliente");
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al eliminar clientes" });
  }
});

// PUT /api/clientes/:id
app.put("/api/clientes/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "ID no definido" });

  try {
    const u = await findUserByIdAndRole(id, "cliente");
    if (!u) return res.status(404).json({ error: "Cliente no encontrado" });

    const actualizado = await model.users.updateUser(id, req.body);
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    if (err.message === "Usuario no encontrado") {
      res.status(404).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message ?? "Error al actualizar cliente" });
    }
  }
});

// DELETE /api/clientes/:id
app.delete("/api/clientes/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  try {
    const ok = await removeUserByIdAndRole(id, "cliente");
    if (!ok) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al eliminar cliente" });
  }
});

// POST /api/clientes/autenticar
app.post("/api/clientes/autenticar", async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await model.users.validate(email, password, "cliente");
    if (!u) return res.status(401).json({ error: "Credenciales inválidas" });
    res.json(safeUser(u));
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: err.message ?? "Error en autenticación" });
  }
});

// ================== ADMINISTRADORES ==================

app.get("/api/admins", async (req, res) => {
  const { email, dni } = req.query;

  try {
    if (email) {
      const u = await model.users.findByEmail(email);
      if (!u || u.rol !== "admin")
        return res.status(404).json({ error: "Admin no encontrado" });
      return res.json(safeUser(u));
    }

    if (dni) {
      const u = await model.users.findByDni(dni);
      if (!u || u.rol !== "admin")
        return res.status(404).json({ error: "Admin no encontrado" });
      return res.json(safeUser(u));
    }

    const admins = await getUsersByRole("admin");
    res.json(admins.map(safeUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// GET /api/admins/:id
app.get("/api/admins/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  try {
    const u = await findUserByIdAndRole(id, "admin");
    if (!u) return res.status(404).json({ error: "Admin no encontrado" });
    res.json(safeUser(u));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// POST /api/admins
app.post("/api/admins", async (req, res) => {
  try {
    const data = { ...req.body, rol: "admin" };
    const admin = await model.users.addUser(data);
    res.status(201).json(safeUser(admin));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al crear admin" });
  }
});

// PUT /api/admins/:id
app.put("/api/admins/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "ID no definido" });

  try {
    const u = await findUserByIdAndRole(id, "admin");
    if (!u) return res.status(404).json({ error: "Admin no encontrado" });

    const actualizado = await model.users.updateUser(id, req.body);
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    if (err.message === "Usuario no encontrado") {
      res.status(404).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message ?? "Error al actualizar admin" });
    }
  }
});

// DELETE /api/admins/:id
app.delete("/api/admins/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  try {
    const ok = await removeUserByIdAndRole(id, "admin");
    if (!ok) return res.status(404).json({ error: "Admin no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al eliminar admin" });
  }
});

app.delete("/api/admins", async (req, res) => {
  try {
    await removeUsersByRole("admin");
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al eliminar admins" });
  }
});

// POST /api/admins/autenticar
app.post("/api/admins/autenticar", async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await model.users.validate(email, password, "admin");
    if (!u) return res.status(401).json({ error: "Credenciales inválidas" });
    res.json(safeUser(u));
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: err.message ?? "Error en autenticación" });
  }
});

// ================== USUARIOS ==================

app.post("/api/usuarios", async (req, res) => {
  try {
    const data = { ...req.body };
    const user = await model.users.addUser(data);
    res.status(201).json(safeUser(user));
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message ?? "Error al crear usuario" });
  }
});

app.post("/api/autenticar", async (req, res) => {
  try {
    const { email, password, rol } = req.body;

    const user = await model.users.validate(email, password, rol);
    if (!user) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const accessToken = jwt.sign({ id: user.id, rol: user.rol }, SECRET_KEY, {
      expiresIn: "1000s",
    });

    return res.status(200).json({ token: accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message ?? "Error en autenticación" });
  }
});

app.get("/api/usuarios/actual", requireAuth, (req, res) => {
  try {
    const usuario = req.user;
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(safeUser(usuario));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message ?? "Error al obtener usuario actual" });
  }
});

app.get("/api/usuarios/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ message: "Id no definido" });

  try {
    if (req.user.rol !== "admin" && String(req.user.id) !== String(id)) {
      return res.status(403).json({ message: "Acceso no autorizado" });
    }

    const u = await model.users.getById(id);
    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json(safeUser(u));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message ?? "Error al obtener usuario" });
  }
});

app.put("/api/usuarios/:id", requireAuth, async (req, res) => {
  try {
    const userId = String(req.user.id);
    const actualizado = await model.users.updateUser(userId, req.body);
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    if (err.message === "Usuario no encontrado") {
      res.status(404).json({ message: err.message });
    } else {
      res.status(400).json({ message: err.message ?? "Error al actualizar usuario" });
    }
  }
});

// ================== CARRO DE COMPRA (CLIENTE) ==================

app.get("/api/clientes/:id/carro", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  const u = await findUserByIdAndRole(id, "cliente");
  if (!u) return res.status(404).json({ error: "Cliente no encontrado" });

  try {
    const cart = await model.carts.get(id);
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error al obtener carro" });
  }
});

app.post("/api/clientes/:id/carro/items", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  const u = await findUserByIdAndRole(id, "cliente");
  if (!u) return res.status(404).json({ error: "Cliente no encontrado" });

  const { libroId, cantidad } = req.body;
  if (!libroId) return res.status(400).json({ error: "libroId requerido" });

  try {
    const qty = cantidad ?? 1;
    const cart = await model.carts.add(id, libroId, qty);
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al agregar al carro" });
  }
});

app.put("/api/clientes/:id/carro/items/:index", async (req, res) => {
  const id = req.params.id;
  const libroId = req.params.index;

  if (!id) return res.status(400).json({ error: "Id no definido" });

  const u = await findUserByIdAndRole(id, "cliente");
  if (!u) return res.status(404).json({ error: "Cliente no encontrado" });

  const cantidad = req.body.cantidad ?? req.body.qty;
  if (cantidad == null) return res.status(400).json({ error: "Cantidad requerida" });

  try {
    const cart = await model.carts.setQty(id, libroId, cantidad);
    res.json(cart);
  } catch (err) {
    const msg = err.message || "";
    if (/Cantidad inválida/i.test(msg)) return res.status(400).json({ error: msg });
    console.error(err);
    res.status(400).json({ error: msg || "Error al actualizar cantidad" });
  }
});

app.delete("/api/clientes/:id/carro/items/:index", async (req, res) => {
  const id = req.params.id;
  const libroId = req.params.index;

  const u = await findUserByIdAndRole(id, "cliente");
  if (!u) return res.status(404).json({ error: "Cliente no encontrado" });

  try {
    const cart = await model.carts.remove(id, libroId);
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al eliminar item" });
  }
});

app.delete("/api/clientes/:id/carro", async (req, res) => {
  const id = req.params.id;

  const u = await findUserByIdAndRole(id, "cliente");
  if (!u) return res.status(404).json({ error: "Cliente no encontrado" });

  try {
    await model.carts.clear(id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al limpiar carro" });
  }
});

// ================== FACTURAS ==================

app.get("/api/facturas", async (req, res) => {
  const { cliente, numero } = req.query;

  try {
    if (cliente) {
      const facturas = await model.facturas.getAll(cliente);
      return res.json(facturas);
    }

    const all = await getAllInvoices();

    if (numero) {
      const f = all.find((x) => String(x.id) === String(numero));
      if (!f) return res.status(404).json({ error: "Factura no encontrada" });
      return res.json(f);
    }

    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// GET /api/facturas/:id (global admin/testing)
app.get("/api/facturas/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  try {
    const f = await model.facturas.getByIdGlobal(id);
    if (!f) return res.status(404).json({ error: "Factura no encontrada" });
    res.json(f);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// DELETE /api/facturas (global admin/testing)
app.delete("/api/facturas", async (req, res) => {
  try {
    await model.facturas.removeAllGlobal();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al eliminar facturas" });
  }
});

// POST /api/facturas -> createFromCart
app.post("/api/facturas", async (req, res) => {
  try {
    const { userId, meta } = req.body;
    if (!userId) return res.status(400).json({ error: "userId requerido" });

    const u = await model.users.getById(userId);
    if (!u) return res.status(404).json({ error: "Usuario no encontrado" });

    const factura = await model.facturas.createFromCart(userId, meta);
    res.json(factura);
  } catch (err) {
    const msg = err.message || "";

    if (
      /Carrito vacío/i.test(msg) ||
      /^Falta razón social/i.test(msg) ||
      /^Falta dirección/i.test(msg) ||
      /^Falta dni/i.test(msg) ||
      /^Falta email/i.test(msg)
    ) {
      return res.status(400).json({ error: msg });
    }

    console.error(err);
    res.status(400).json({ error: msg || "Error al crear factura" });
  }
});

// ================== AJUSTES SPA + 404 ==================


if (process.env.SERVE_STATIC === "1") {
  app.use("/", express.static(path.join(STATIC_DIR, "public")));
  app.use("/libreria*", (req, res) => {
    res.sendFile(path.join(STATIC_DIR, "public/libreria/index.html"));
  });
}


app.all("*", (req, res) => {
  console.error(`${req.originalUrl} not found!`);
  res
    .status(404)
    .send(
      "<html><head><title>Not Found</title></head><body><h1>Not found!</h1></body></html>"
    );
});
