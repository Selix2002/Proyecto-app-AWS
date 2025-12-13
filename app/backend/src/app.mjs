import express from "express";
import path from "path";
import url from "url";
import passport from "passport";
import { Strategy as JWTStrategy, ExtractJwt as ExtractJWT } from "passport-jwt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();  
asd

import { model } from "../model/model.mjs";

// Modelos directos para operaciones masivas
import { Usuario } from "../model/schema/usuario.mjs";
import { Libro } from "../model/schema/libro.mjs";
import { Factura } from "../model/schema/factura.mjs";


const STATIC_DIR = url.fileURLToPath(new URL(".", import.meta.url));

export const app = express();

app.use("/", express.static(path.join(STATIC_DIR, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== JWT / PASSPORT ==================
const SECRET_KEY = process.env.JWT_SECRET;

// extrae el token del header
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: SECRET_KEY,
    },
    async (jwtPayload, done) => {
      try {
        const user = await Usuario.findById(jwtPayload.id).exec();
        if (!user) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// Inicializar passport
app.use(passport.initialize());

// Middleware para autenticar con JWT. Para bloquer rutas que requieran autenticación. No se usa actualmente, pero basta con añadirlo en la cabera de la función de ruta:
// app.delete("/ruta-protegida", requireAuth, (req, res) => { ... });
const requireAuth = passport.authenticate("jwt", { session: false });
// ================== HELPERS ==================

function safeUser(u) {
  if (!u) return null;
  const obj = u.toObject ? u.toObject() : u;
  const { password, ...safe } = obj;
  return safe;
}

async function getUsersByRole(rol) {
  const users = await Usuario.find({ rol }).exec();
  return users.map(safeUser);
}

async function removeUsersByRole(rol) {
  await Usuario.deleteMany({ rol }).exec();
}

async function findUserByIdAndRole(id, rol) {
  if (!id) return null;
  const u = await model.users.getById(id);
  if (!u || u.rol !== rol) return null;
  return u;
}

async function removeUserByIdAndRole(id, rol) {
  const result = await Usuario.deleteOne({ _id: id, rol }).exec();
  return result.deletedCount > 0;
}

async function getAllInvoices() {
  return Factura.find().exec();
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

    // todos
    res.json(libros);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// GET /api/libros/:id
app.get("/api/libros/:id",async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  try {
    const libro = await model.libros.getLibroPorId(id);
    if (!libro) return res.status(404).json({ error: "Libro no encontrado" });
    res.json(libro);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// POST /api/libros  -> addLibro
app.post("/api/libros", async (req, res) => {
  try {
    const libro = await model.libros.addLibro(req.body);
    res.json(libro);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al crear libro" });
  }
});

// PUT /api/libros -> setLibros(array)
app.put("/api/libros",async (req, res) => {
  try {
    const arr = Array.isArray(req.body) ? req.body : [];

    // borrar todos los libros de la colección
    await Libro.deleteMany({}).exec();

    const nuevos = [];
    for (const data of arr) {
      const libro = await model.libros.addLibro(data);
      nuevos.push(libro);
    }

    const librosFinales = await model.libros.getLibros();
    res.json(librosFinales);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al reemplazar libros" });
  }
});

// DELETE /api/libros -> removeLibros()
app.delete("/api/libros", async (req, res) => {
  try {
    await Libro.deleteMany({}).exec();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al eliminar libros" });
  }
});

// PUT /api/libros/:id -> updateLibro(id)
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

// DELETE /api/libros/:id -> removeLibro(id)
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
      res
        .status(400)
        .json({ error: err.message ?? "Error al eliminar libro" });
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
    res.json(clientes);
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

// POST /api/clientes -> addCliente (registro cliente)
app.post("/api/clientes", async (req, res) => {
  try {
    const data = { ...req.body };
    const user = await model.users.addUser(data);
    res.json(safeUser(user));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al crear cliente" });
  }
});

// PUT /api/clientes  -> setClientes(array)
app.put("/api/clientes", async (req, res) => {
  try {
    const arr = Array.isArray(req.body) ? req.body : [];

    // eliminar clientes actuales en BD
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
    res
      .status(400)
      .json({ error: err.message ?? "Error al reemplazar clientes" });
  }
});

// DELETE /api/clientes -> removeClientes()
app.delete("/api/clientes", async (req, res) => {
  try {
    await removeUsersByRole("cliente");
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ error: err.message ?? "Error al eliminar clientes" });
  }
});

// PUT /api/clientes/:id -> updateCliente(id)
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
      res
        .status(400)
        .json({ error: err.message ?? "Error al actualizar cliente" });
    }
  }
});

// DELETE /api/clientes/:id -> removeCliente(id)
app.delete("/api/clientes/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  try {
    const ok = await removeUserByIdAndRole(id, "cliente");
    if (!ok) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ error: err.message ?? "Error al eliminar cliente" });
  }
});

// POST /api/clientes/autenticar -> autenticar cliente
app.post("/api/clientes/autenticar", async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await model.users.validate(email, password, "cliente");
    if (!u) return res.status(401).json({ error: "Credenciales inválidas" });
    res.json(safeUser(u));
  } catch (err) {
    console.error(err);
    res
      .status(401)
      .json({ error: err.message ?? "Error en autenticación" });
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
    res.json(admins);
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

// POST /api/admins -> addAdmin
app.post("/api/admins", async (req, res) => {
  try {
    const data = { ...req.body, rol: "admin" };
    const admin = await model.users.addUser(data);
    res.json(safeUser(admin));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Error al crear admin" });
  }
});

// PUT /api/admins/:id -> updateAdmin(id)
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
      res
        .status(400)
        .json({ error: err.message ?? "Error al actualizar admin" });
    }
  }
});

// DELETE /api/admins/:id -> removeAdmin(id)
app.delete("/api/admins/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  try {
    const ok = await removeUserByIdAndRole(id, "admin");
    if (!ok) return res.status(404).json({ error: "Admin no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ error: err.message ?? "Error al eliminar admin" });
  }
});

app.delete("/api/admins", async (req, res) => {
  try {
    await removeUsersByRole("admin");
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ error: err.message ?? "Error al eliminar admins" });
  }
});

// POST /api/admins/autenticar -> autenticar admin
app.post("/api/admins/autenticar", async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await model.users.validate(email, password, "admin");
    if (!u) return res.status(401).json({ error: "Credenciales inválidas" });
    res.json(safeUser(u));
  } catch (err) {
    console.error(err);
    res
      .status(401)
      .json({ error: err.message ?? "Error en autenticación" });
  }
});

// ================== USUARIOS ==================

// Registro de usuarios
app.post("/api/usuarios", async (req, res) => {
  try {
    const data = { ...req.body };
    const user = await model.users.addUser(data);
    // safeUser quita el password
    res.json(safeUser(user));
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message ?? "Error al crear usuario" });
  }
});

// Autenticación de usuarios
app.post("/api/autenticar", async (req, res) => {
  try {
    const { email, password, rol } = req.body;

    // validate ya usa bcrypt por debajo
    const user = await model.users.validate(email, password, rol);
    if (!user) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    // Generar token
    const accessToken = jwt.sign(
      { id: user._id.toString(), rol: user.rol },
      SECRET_KEY,
      { expiresIn: "1000s" } //Expira en 1000 segundos
    );

    return res.status(200).json({ token: accessToken });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: err.message ?? "Error en autenticación" });
  }
});

// Usuario actual
app.get(
  "/api/usuarios/actual",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    try {
      const usuario = req.user;
      if (!usuario) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      res.json(safeUser(usuario));
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: err.message ?? "Error al obtener usuario actual" });
    }
  }
);

// Obtener usuario por ID
// Admin puede ver cualquier usuario
app.get(
  "/api/usuarios/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "Id no definido" });

    try {
      // Si no es admin y pide otro id distinto al suyo: 403
      if (
        req.user.rol !== "admin" &&
        String(req.user._id) !== String(id)
      ) {
        return res.status(403).json({ message: "Acceso no autorizado" });
      }

      const u = await model.users.getById(id);
      if (!u) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      res.json(safeUser(u));
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: err.message ?? "Error al obtener usuario" });
    }
  }
);

// Modificar perfil del usuario autenticado
app.put("/api/usuarios/:id",passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user._id.toString();

      const actualizado = await model.users.updateUser(userId, req.body);
      res.json(actualizado);
    } catch (err) {
      console.error(err);
      if (err.message === "Usuario no encontrado") {
        res.status(404).json({ message: err.message });
      } else {
        res
          .status(400)
          .json({ message: err.message ?? "Error al actualizar usuario" });
      }
    }
  }
);





// ================== CARRO DE COMPRA (CLIENTE) ==================

// GET /api/clientes/:id/carro
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

// POST /api/clientes/:id/carro/items -> addClienteCarroItem
// body: { libroId, cantidad }
app.post("/api/clientes/:id/carro/items", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  const u = await findUserByIdAndRole(id, "cliente");
  if (!u) return res.status(404).json({ error: "Cliente no encontrado" });

  const { libroId, cantidad } = req.body;
  if (!libroId)
    return res.status(400).json({ error: "libroId requerido" });

  try {
    const qty = cantidad ?? 1;
    const cart = await model.carts.add(id, libroId, qty);
    res.json(cart);
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ error: err.message ?? "Error al agregar al carro" });
  }
});

// PUT /api/clientes/:id/carro/items/:index
// body: { cantidad } (o { qty })
app.put("/api/clientes/:id/carro/items/:index", async (req, res) => {
  const id = req.params.id;
  const libroId = req.params.index;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  const u = await findUserByIdAndRole(id, "cliente");
  if (!u) return res.status(404).json({ error: "Cliente no encontrado" });

  const cantidad = req.body.cantidad ?? req.body.qty;
  if (cantidad == null) {
    return res.status(400).json({ error: "Cantidad requerida" });
  }

  try {
    const cart = await model.carts.setQty(id, libroId, cantidad);
    res.json(cart);
  } catch (err) {
    const msg = err.message || "";
    if (/Cantidad inválida/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    console.error(err);
    res
      .status(400)
      .json({ error: msg || "Error al actualizar cantidad" });
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
    res
      .status(400)
      .json({ error: err.message ?? "Error al eliminar item" });
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
    res
      .status(400)
      .json({ error: err.message ?? "Error al limpiar carro" });
  }
});

// ================== FACTURAS ==================

// GET /api/facturas
//   - sin query: todas
//   - ?cliente=id -> getFacturasPorCliente
//   - ?numero=n  -> getFacturaPorNumero
app.get("/api/facturas", async (req, res) => {
  const { cliente, numero } = req.query;

  try {
    if (cliente) {
      const facturas = await model.facturas.getAll(cliente);
      return res.json(facturas);
    }

    const all = await getAllInvoices();

    if (numero) {
      const f = all.find((x) => x.id === numero);
      if (!f) return res.status(404).json({ error: "Factura no encontrada" });
      return res.json(f);
    }

    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// GET /api/facturas/:id -> getFacturaPorId(id)
app.get("/api/facturas/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Id no definido" });

  try {
    const f = await Factura.findById(id).exec();
    if (!f) return res.status(404).json({ error: "Factura no encontrada" });
    res.json(f);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

// DELETE /api/facturas -> removeFacturas()
app.delete("/api/facturas", async (req, res) => {
  try {
    await Factura.deleteMany({}).exec();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ error: err.message ?? "Error al eliminar facturas" });
  }
});

// POST /api/facturas -> facturarCompraCliente(obj)
app.post("/api/facturas", async (req, res) => {
  try {
    const { userId, meta } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId requerido" });
    }

    const u = await model.users.getById(userId);
    if (!u) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

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


app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


app.use("/libreria*", (req, res) => {
  res.sendFile(path.join(STATIC_DIR, "public/libreria/index.html"));
});

app.all("*", (req, res) => {
  console.error(`${req.originalUrl} not found!`);
  res
    .status(404)
    .send(
      "<html><head><title>Not Found</title></head><body><h1>Not found!</h1></body></html>"
    );
});

