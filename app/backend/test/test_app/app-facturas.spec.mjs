// /test/app-facturas.spec.mjs

import request from "supertest";
import * as chai from "chai";
import mongoose from "mongoose";

import { app } from "../../app.mjs";
import { model } from "../../model/model.mjs";
import {
  connectDB,
  clearMongoTest,
  resetMongoTest,
} from "../helpers/db_test.mjs";

const { assert } = chai;
const { Types } = mongoose;

// helper para obtener id string de docs (service o mongoose)
function docId(doc) {
  return (doc?.id ?? doc?._id)?.toString();
}

describe("API Facturas (Mongo, app.mjs)", () => {
  let cliente1;
  let cliente2;
  let libro1;
  let libro2;

  let cliente1Id;
  let cliente2Id;
  let libro1Id;
  let libro2Id;

  // Conexión a la base de pruebas
  before(async () => {
    await connectDB();
  });

  // Antes de cada test limpiamos la BD y sembramos datos base
  beforeEach(async () => {
    await clearMongoTest();

    // Dos clientes base
    cliente1 = await model.users.addUser({
      dni: "1000",
      nombres: "Cliente",
      apellidos: "Uno",
      direccion: "Dir 1",
      telefono: "111",
      email: "cliente1@mail.com",
      password: "c1",
    });
    cliente2 = await model.users.addUser({
      dni: "2000",
      nombres: "Cliente",
      apellidos: "Dos",
      direccion: "Dir 2",
      telefono: "222",
      email: "cliente2@mail.com",
      password: "c2",
    });

    cliente1Id = docId(cliente1);
    cliente2Id = docId(cliente2);

    // Libros base (ojo con resumen requerido)
    libro1 = await model.libros.addLibro({
      isbn: "L1",
      titulo: "Libro A",
      autores: "Autor X",
      stock: 3,
      precio: 1000,
      resumen: "Resumen libro A",
    });
    libro2 = await model.libros.addLibro({
      isbn: "L2",
      titulo: "Libro B",
      autores: "Autor Y",
      stock: 5,
      precio: 2500,
      resumen: "Resumen libro B",
    });

    libro1Id = docId(libro1);
    libro2Id = docId(libro2);
  });

  // Al final cerramos/dropeamos la base de pruebas
  after(async () => {
    await resetMongoTest();
  });

  // Helper async para armar el carro de un usuario
  async function seedCartForUser(userId) {
    // 2 * libro1 (1000) + 1 * libro2 (2500) = 4500
    await model.carts.add(userId, libro1Id, 2);
    await model.carts.add(userId, libro2Id, 1);
    return await model.carts.get(userId);
  }

  it("POST /api/facturas crea factura desde el carrito y limpia el carrito", async () => {
    const beforeCart = await seedCartForUser(cliente1Id);

    const meta = {
      razonSocial: "Mi Pyme",
      direccion: "Calle 1",
      dni: "11",
      email: "c@c",
    };

    const res = await request(app)
      .post("/api/facturas")
      .send({ userId: cliente1Id, meta })
      .expect(200);

    const fac = res.body;
    const facId = fac.id ?? fac._id;

    // Estructura básica
    assert.ok(facId, "factura debe tener id");
    assert.ok(fac.fechaISO, "factura debe tener fechaISO");
    assert.equal(fac.meta.razonSocial, meta.razonSocial);
    assert.equal(fac.meta.direccion, meta.direccion);
    assert.equal(fac.meta.dni, meta.dni);
    assert.equal(fac.meta.email, meta.email);

    // Totales iguales al carrito
    assert.equal(fac.subtotal, beforeCart.subtotal);
    assert.closeTo(fac.iva, beforeCart.iva, 1e-9);
    assert.closeTo(fac.total, beforeCart.total, 1e-9);
    assert.equal(fac.ivaRate, beforeCart.ivaRate);

    // Items clonados
    assert.equal(fac.items.length, beforeCart.items.length);
    assert.equal(fac.items[0].subtotal, beforeCart.items[0].subtotal);

    // Carrito del cliente queda vacío
    const afterCart = await model.carts.get(cliente1Id);
    assert.equal(afterCart.items.length, 0);
    assert.equal(afterCart.subtotal, 0);
    assert.equal(afterCart.iva, 0);
    assert.equal(afterCart.total, 0);
  });

  it("GET /api/facturas devuelve todas las facturas de todos los usuarios", async () => {
    // Factura cliente1
    await seedCartForUser(cliente1Id);
    const meta1 = {
      razonSocial: "Cliente 1 SPA",
      direccion: "Dir C1",
      dni: "11",
      email: "c1@c",
    };
    const res1 = await request(app)
      .post("/api/facturas")
      .send({ userId: cliente1Id, meta: meta1 })
      .expect(200);
    const f1 = res1.body;
    const f1Id = f1.id ?? f1._id;

    // Factura cliente2
    await seedCartForUser(cliente2Id);
    const meta2 = {
      razonSocial: "Cliente 2 SPA",
      direccion: "Dir C2",
      dni: "22",
      email: "c2@c",
    };
    const res2 = await request(app)
      .post("/api/facturas")
      .send({ userId: cliente2Id, meta: meta2 })
      .expect(200);
    const f2 = res2.body;
    const f2Id = f2.id ?? f2._id;

    const resAll = await request(app).get("/api/facturas").expect(200);

    const todas = resAll.body;
    assert.isArray(todas);
    assert.equal(todas.length, 2);

    const ids = todas.map((f) => f.id ?? f._id);
    assert.include(ids, f1Id);
    assert.include(ids, f2Id);
  });

  it("GET /api/facturas?cliente=id devuelve solo las facturas del cliente", async () => {
    // Cliente1: 2 facturas
    await seedCartForUser(cliente1Id);
    const f1 = (
      await request(app)
        .post("/api/facturas")
        .send({
          userId: cliente1Id,
          meta: {
            razonSocial: "C1-1",
            direccion: "D1",
            dni: "11",
            email: "c1-1@mail.com",
          },
        })
        .expect(200)
    ).body;

    await seedCartForUser(cliente1Id);
    const f2 = (
      await request(app)
        .post("/api/facturas")
        .send({
          userId: cliente1Id,
          meta: {
            razonSocial: "C1-2",
            direccion: "D2",
            dni: "11",
            email: "c1-2@mail.com",
          },
        })
        .expect(200)
    ).body;

    const f1Id = f1.id ?? f1._id;
    const f2Id = f2.id ?? f2._id;

    // Cliente2: 1 factura
    await seedCartForUser(cliente2Id);
    await request(app)
      .post("/api/facturas")
      .send({
        userId: cliente2Id,
        meta: {
          razonSocial: "C2-1",
          direccion: "D3",
          dni: "22",
          email: "c2-1@mail.com",
        },
      })
      .expect(200);

    const resCliente1 = await request(app)
      .get("/api/facturas")
      .query({ cliente: cliente1Id })
      .expect(200);

    const arrC1 = resCliente1.body;
    assert.equal(arrC1.length, 2);

    const idsC1 = arrC1.map((f) => f.id ?? f._id);
    assert.deepEqual(idsC1.sort(), [f1Id, f2Id].sort());
  });

  it("GET /api/facturas?numero=id devuelve la factura correcta", async () => {
    await seedCartForUser(cliente1Id);
    const { body: f1 } = await request(app)
      .post("/api/facturas")
      .send({
        userId: cliente1Id,
        meta: {
          razonSocial: "NumTest",
          direccion: "Dx",
          dni: "33",
          email: "num@test.com",
        },
      })
      .expect(200);

    const f1Id = f1.id ?? f1._id;

    const res = await request(app)
      .get("/api/facturas")
      .query({ numero: f1Id })
      .expect(200);

    assert.equal(res.body.id ?? res.body._id, f1Id);
    assert.equal(res.body.meta.razonSocial, "NumTest");
  });

  describe("Excepciones", () => {
    it("GET /api/facturas?numero=desconocido responde 404", async () => {
      const res = await request(app)
        .get("/api/facturas")
        .query({ numero: "NO-EXISTE" }) // no hay cast, es seguro
        .expect(404);

      assert.property(res.body, "error");
      assert.match(res.body.error, /Factura no encontrada/i);
    });

    it("GET /api/facturas/:id responde 404 si no existe", async () => {
      // id válido pero inexistente
      const fakeId = new Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/facturas/${fakeId}`)
        .expect(404);

      assert.property(res.body, "error");
      assert.match(res.body.error, /Factura no encontrada/i);
    });

    it("POST /api/facturas responde 400 si falta userId", async () => {
      const meta = {
        razonSocial: "Sin ID",
        direccion: "Dx",
        dni: "11",
        email: "sinid@mail.com",
      };

      const res = await request(app)
        .post("/api/facturas")
        .send({ meta })
        .expect(400);

      assert.match(res.body.error || "", /userId requerido/i);
    });

    it("POST /api/facturas responde 404 si userId no existe", async () => {
      const meta = {
        razonSocial: "User no existe",
        direccion: "Dy",
        dni: "22",
        email: "no-user@mail.com",
      };

      const fakeUserId = new Types.ObjectId().toString();

      const res = await request(app)
        .post("/api/facturas")
        .send({ userId: fakeUserId, meta })
        .expect(404);

      assert.match(res.body.error || "", /Usuario no encontrado/i);
    });

    it("POST /api/facturas responde 400 si el carrito está vacío", async () => {
      const meta = {
        razonSocial: "Carro vacío",
        direccion: "Dz",
        dni: "33",
        email: "carro-vacio@mail.com",
      };

      const res = await request(app)
        .post("/api/facturas")
        .send({ userId: cliente1Id, meta })
        .expect(400);

      if (res.body.error) {
        assert.match(res.body.error, /Carrito vacío/i);
      }
    });

    it("POST /api/facturas responde 400 si falta razonSocial/direccion/dni/email en meta", async () => {
      await model.carts.add(cliente1Id, libro1Id, 1);

      // Falta razón social
      let res = await request(app)
        .post("/api/facturas")
        .send({
          userId: cliente1Id,
          meta: { direccion: "x", dni: "1", email: "a@mail.com" },
        })
        .expect(400);
      if (res.body.error) assert.match(res.body.error, /Razón social/i);

      // Falta dirección
      await model.carts.add(cliente1Id, libro1Id, 1);
      res = await request(app)
        .post("/api/facturas")
        .send({
          userId: cliente1Id,
          meta: { razonSocial: "X", dni: "1", email: "a@mail.com" },
        })
        .expect(400);
      if (res.body.error) assert.match(res.body.error, /dirección/i);

      // Falta dni
      await model.carts.add(cliente1Id, libro1Id, 1);
      res = await request(app)
        .post("/api/facturas")
        .send({
          userId: cliente1Id,
          meta: { razonSocial: "X", direccion: "x", email: "a@mail.com" },
        })
        .expect(400);
      if (res.body.error) assert.match(res.body.error, /dni/i);

      // Falta email
      await model.carts.add(cliente1Id, libro1Id, 1);
      res = await request(app)
        .post("/api/facturas")
        .send({
          userId: cliente1Id,
          meta: { razonSocial: "X", direccion: "x", dni: "1" },
        })
        .expect(400);
      if (res.body.error) assert.match(res.body.error, /email/i);
    });
  });

  it("GET /api/facturas/:id devuelve la factura correcta", async () => {
    await seedCartForUser(cliente1Id);
    const { body: f1 } = await request(app)
      .post("/api/facturas")
      .send({
        userId: cliente1Id,
        meta: {
          razonSocial: "IDTest",
          direccion: "Dy",
          dni: "44",
          email: "id@test.com",
        },
      })
      .expect(200);

    const f1Id = f1.id ?? f1._id;

    const res = await request(app)
      .get(`/api/facturas/${f1Id}`)
      .expect(200);

    assert.equal(res.body.id ?? res.body._id, f1Id);
    assert.equal(res.body.meta.razonSocial, "IDTest");
  });

  it("DELETE /api/facturas elimina todas las facturas de todos los usuarios", async () => {
    // Creamos un par de facturas
    await seedCartForUser(cliente1Id);
    await request(app)
      .post("/api/facturas")
      .send({
        userId: cliente1Id,
        meta: {
          razonSocial: "Borrar1",
          direccion: "D1",
          dni: "11",
          email: "b1@mail.com",
        },
      })
      .expect(200);

    await seedCartForUser(cliente2Id);
    await request(app)
      .post("/api/facturas")
      .send({
        userId: cliente2Id,
        meta: {
          razonSocial: "Borrar2",
          direccion: "D2",
          dni: "22",
          email: "b2@mail.com",
        },
      })
      .expect(200);

    const resBefore = await request(app).get("/api/facturas").expect(200);
    assert.isAbove(resBefore.body.length, 0);

    await request(app).delete("/api/facturas").expect(200);

    const resAfter = await request(app).get("/api/facturas").expect(200);
    assert.isArray(resAfter.body);
    assert.equal(resAfter.body.length, 0);
  });
});
