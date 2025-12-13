// /test/app-carro.spec.mjs

import request from "supertest";
import * as chai from "chai";
import { app } from "../../app.mjs";
import { model } from "../../model/model.mjs";
import {
  connectDB,
  clearMongoTest,
  resetMongoTest,
} from "../helpers/db_test.mjs";

const { assert } = chai;

// Helper para obtener id como string
function getId(o) {
  return (o && (o.id ?? o._id))?.toString();
}

const NON_EXISTENT_ID = "000000000000000000000";

describe("API Carrito (Mongo, app.mjs)", () => {
  let cliente;
  let clienteId;
  let libro1;
  let libro2;
  let libro1Id;
  let libro2Id;

  // Conexión global a la BD de pruebas
  before(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearMongoTest();

    cliente = await model.users.addUser({
      dni: "1",
      nombres: "Carrito",
      apellidos: "Tester",
      direccion: "Dir Carrito",
      telefono: "123",
      email: "carrito@test.com",
      password: "1234",
    });
    clienteId = getId(cliente);

    // Libros base (ojo con 'resumen' requerido)
    libro1 = await model.libros.addLibro({
      isbn: "L1",
      titulo: "Libro A",
      autores: "Autor X",
      stock: 3,
      precio: 1000,
      resumen: "Resumen L1",
    });
    libro2 = await model.libros.addLibro({
      isbn: "L2",
      titulo: "Libro B",
      autores: "Autor Y",
      stock: 5,
      precio: 2500,
      resumen: "Resumen L2",
    });

    libro1Id = getId(libro1);
    libro2Id = getId(libro2);
  });

  after(async () => {
    await resetMongoTest();
  });

  it("GET /api/clientes/:id/carro retorna carrito vacío inicial", async () => {
    const res = await request(app)
      .get(`/api/clientes/${clienteId}/carro`)
      .expect(200);

    const cart = res.body;
    assert.isArray(cart.items);
    assert.equal(cart.items.length, 0);
    assert.equal(cart.subtotal, 0);
    assert.equal(cart.iva, 0);
    assert.equal(cart.total, 0);
    assert.closeTo(cart.ivaRate, 0.04, 1e-9);
  });

  it("POST /api/clientes/:id/carro/items agrega item y calcula totales", async () => {
    const res = await request(app)
      .post(`/api/clientes/${clienteId}/carro/items`)
      .send({ libroId: libro1Id, cantidad: 2 })
      .expect(200);

    const cart = res.body;
    assert.isArray(cart.items);
    assert.equal(cart.items.length, 1);

    const item = cart.items[0];
    assert.equal(item.libroId, libro1Id);
    assert.equal(item.cantidad, 2);
    assert.equal(item.precio, libro1.precio);
    assert.equal(item.subtotal, 2 * libro1.precio);

    const expectedSubtotal = 2 * libro1.precio;
    const expectedIva = expectedSubtotal * cart.ivaRate;
    const expectedTotal = expectedSubtotal + expectedIva;

    assert.equal(cart.subtotal, expectedSubtotal);
    assert.closeTo(cart.iva, expectedIva, 1e-9);
    assert.closeTo(cart.total, expectedTotal, 1e-9);
  });

  it("POST /carro/items respeta el stock máximo del libro", async () => {
    // libro1.stock = 3
    const res = await request(app)
      .post(`/api/clientes/${clienteId}/carro/items`)
      .send({ libroId: libro1Id, cantidad: 999 })
      .expect(200);

    const cart = res.body;
    const item = cart.items.find((i) => i.libroId === libro1Id);
    assert.equal(item.cantidad, libro1.stock, "no debe superar el stock");
    assert.equal(item.subtotal, libro1.stock * libro1.precio);
  });

  it("POST /carro/items acumula cantidades de un mismo libro", async () => {
    await request(app)
      .post(`/api/clientes/${clienteId}/carro/items`)
      .send({ libroId: libro1Id, cantidad: 1 })
      .expect(200);

    const res2 = await request(app)
      .post(`/api/clientes/${clienteId}/carro/items`)
      .send({ libroId: libro1Id, cantidad: 2 })
      .expect(200);

    const cart = res2.body;
    const item = cart.items.find((i) => i.libroId === libro1Id);
    assert.equal(item.cantidad, 3);
  });

  it("PUT /carro/items/:index actualiza cantidad y respeta stock", async () => {
    await request(app)
      .post(`/api/clientes/${clienteId}/carro/items`)
      .send({ libroId: libro2Id, cantidad: 1 })
      .expect(200);

    // Subir a un valor mayor al stock -> debe quedar en 5
    const resUp = await request(app)
      .put(`/api/clientes/${clienteId}/carro/items/${libro2Id}`)
      .send({ cantidad: 99 })
      .expect(200);

    let cart = resUp.body;
    let item = cart.items.find((i) => i.libroId === libro2Id);
    assert.equal(item.cantidad, libro2.stock);

    // Bajar a 0 -> debe eliminar el item
    const resDown = await request(app)
      .put(`/api/clientes/${clienteId}/carro/items/${libro2Id}`)
      .send({ cantidad: 0 })
      .expect(200);

    cart = resDown.body;
    item = cart.items.find((i) => i.libroId === libro2Id);
    assert.isUndefined(item, "el item debe ser eliminado cuando cantidad=0");
  });

  it("DELETE /carro/items/:index elimina un item y actualiza totales", async () => {
    // libro1: 2 * 1000 = 2000
    // libro2: 1 * 2500 = 2500
    await request(app)
      .post(`/api/clientes/${clienteId}/carro/items`)
      .send({ libroId: libro1Id, cantidad: 2 })
      .expect(200);

    await request(app)
      .post(`/api/clientes/${clienteId}/carro/items`)
      .send({ libroId: libro2Id, cantidad: 1 })
      .expect(200);

    const before = await request(app)
      .get(`/api/clientes/${clienteId}/carro`)
      .expect(200);

    assert.equal(before.body.items.length, 2);

    const resDel = await request(app)
      .delete(`/api/clientes/${clienteId}/carro/items/${libro1Id}`)
      .expect(200);

    const cart = resDel.body;
    assert.equal(cart.items.length, 1);
    assert.isUndefined(cart.items.find((i) => i.libroId === libro1Id));

    const expectedSubtotal = libro2.precio * 1;
    const expectedIva = expectedSubtotal * cart.ivaRate;
    const expectedTotal = expectedSubtotal + expectedIva;

    assert.equal(cart.subtotal, expectedSubtotal);
    assert.closeTo(cart.iva, expectedIva, 1e-9);
    assert.closeTo(cart.total, expectedTotal, 1e-9);
  });

  it("DELETE /carro vacía completamente el carrito", async () => {
    await request(app)
      .post(`/api/clientes/${clienteId}/carro/items`)
      .send({ libroId: libro1Id, cantidad: 1 })
      .expect(200);

    await request(app)
      .post(`/api/clientes/${clienteId}/carro/items`)
      .send({ libroId: libro2Id, cantidad: 1 })
      .expect(200);

    const before = await request(app)
      .get(`/api/clientes/${clienteId}/carro`)
      .expect(200);

    assert.isAbove(before.body.items.length, 0);

    await request(app).delete(`/api/clientes/${clienteId}/carro`).expect(200);

    const after = await request(app)
      .get(`/api/clientes/${clienteId}/carro`)
      .expect(200);

    assert.equal(after.body.items.length, 0);
    assert.equal(after.body.subtotal, 0);
    assert.equal(after.body.iva, 0);
    assert.equal(after.body.total, 0);
  });

  // ---------- Errores y casos borde ----------
  describe("Excepciones", () => {
    it("GET /carro responde 404 si el cliente no existe", async () => {
      await request(app)
        .get(`/api/clientes/${NON_EXISTENT_ID}/carro`)
        .expect(404);
    });

    it("POST /carro/items responde 400 si falta libroId", async () => {
      await request(app)
        .post(`/api/clientes/${clienteId}/carro/items`)
        .send({ cantidad: 1 })
        .expect(400);
    });

    it("POST /carro/items responde 404 si el cliente no existe", async () => {
      await request(app)
        .post(`/api/clientes/${NON_EXISTENT_ID}/carro/items`)
        .send({ libroId: libro1Id, cantidad: 1 })
        .expect(404);
    });

    it("PUT /carro/items/:index responde 400 si falta cantidad", async () => {
      await request(app)
        .post(`/api/clientes/${clienteId}/carro/items`)
        .send({ libroId: libro1Id, cantidad: 1 })
        .expect(200);

      await request(app)
        .put(`/api/clientes/${clienteId}/carro/items/${libro1Id}`)
        .send({}) // sin cantidad
        .expect(400);
    });

    it("PUT /carro/items/:index responde 400 si cantidad es inválida (ej: negativa)", async () => {
      await request(app)
        .post(`/api/clientes/${clienteId}/carro/items`)
        .send({ libroId: libro1Id, cantidad: 1 })
        .expect(200);

      await request(app)
        .put(`/api/clientes/${clienteId}/carro/items/${libro1Id}`)
        .send({ cantidad: -2 })
        .expect(400);
    });

    it("DELETE /carro/items/:index responde 404 si el cliente no existe", async () => {
      await request(app)
        .delete(`/api/clientes/${NON_EXISTENT_ID}/carro/items/${libro1Id}`)
        .expect(404);
    });

    it("DELETE /carro responde 404 si el cliente no existe", async () => {
      await request(app)
        .delete(`/api/clientes/${NON_EXISTENT_ID}/carro`)
        .expect(404);
    });
  });
});
