// /test/app-libros.spec.mjs

import request from "supertest";
import * as chai from "chai";
import mongoose from "mongoose";

const { assert } = chai;
const { Types } = mongoose;

import { app } from "../../app.mjs";
import {
  connectDB,
  clearMongoTest,
  resetMongoTest,
} from "../helpers/db_test.mjs";


describe("API Libros (Mongo, app.mjs)", () => {
  before(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearMongoTest();
  });

  after(async () => {
    await resetMongoTest();
  });

  it("GET /api/libros debe iniciar vacío tras reset", async () => {
    const res = await request(app).get("/api/libros").expect(200);

    assert.isArray(res.body);
    assert.deepEqual(res.body, []);
  });

  it("POST /api/libros crea un libro y GET /api/libros lo devuelve", async () => {
    const nuevo = {
      isbn: "X",
      titulo: "T1",
      autores: "AU",
      stock: 2,
      precio: 1500,
      resumen: "Resumen T1",
    };

    const resPost = await request(app)
      .post("/api/libros")
      .send(nuevo)
      .expect(200);

    const creado = resPost.body;
    assert.ok(creado._id, "debe asignar _id");
    assert.equal(creado.isbn, "X");
    assert.equal(creado.titulo, "T1");

    const resGetAll = await request(app).get("/api/libros").expect(200);

    assert.equal(resGetAll.body.length, 1);
    assert.equal(resGetAll.body[0]._id, creado._id);
  });

  it("GET /api/libros/:id devuelve el libro correcto", async () => {
    const nuevo = {
      isbn: "Y",
      titulo: "T2",
      autores: "AU2",
      stock: 3,
      precio: 2500,
      resumen: "Resumen T2",
    };

    const { body: creado } = await request(app)
      .post("/api/libros")
      .send(nuevo)
      .expect(200);

    const resGet = await request(app)
      .get(`/api/libros/${creado._id}`)
      .expect(200);

    assert.equal(resGet.body.titulo, "T2");
    assert.equal(resGet.body.isbn, "Y");
  });

  it("PUT /api/libros/:id actualiza campos de un libro existente", async () => {
    const { body: creado } = await request(app)
      .post("/api/libros")
      .send({
        isbn: "Z",
        titulo: "Viejo",
        autores: "AU",
        stock: 1,
        precio: 1000,
        resumen: "Resumen viejo",
      })
      .expect(200);

    const patch = { titulo: "Nuevo", stock: 5, precio: 1800 };

    const resPut = await request(app)
      .put(`/api/libros/${creado._id}`)
      .send(patch)
      .expect(200);

    assert.equal(resPut.body.titulo, "Nuevo");
    assert.equal(resPut.body.stock, 5);
    assert.equal(resPut.body.precio, 1800);

    const { body: reread } = await request(app)
      .get(`/api/libros/${creado._id}`)
      .expect(200);

    assert.equal(reread.titulo, "Nuevo");
  });

  it("DELETE /api/libros/:id elimina un libro y deja la colección vacía", async () => {
    const { body: creado } = await request(app)
      .post("/api/libros")
      .send({
        isbn: "DEL",
        titulo: "ToDelete",
        autores: "AU",
        stock: 2,
        precio: 900,
        resumen: "Resumen borrable",
      })
      .expect(200);

    await request(app).delete(`/api/libros/${creado._id}`).expect(200);

    const resGet = await request(app).get("/api/libros").expect(200);

    assert.equal(resGet.body.length, 0);
  });

  it("DELETE /api/libros borra todos los libros", async () => {
    await request(app)
      .post("/api/libros")
      .send({
        isbn: "1",
        titulo: "A",
        autores: "X",
        stock: 1,
        precio: 1000,
        resumen: "Resumen A",
      })
      .expect(200);

    await request(app)
      .post("/api/libros")
      .send({
        isbn: "2",
        titulo: "B",
        autores: "Y",
        stock: 1,
        precio: 2000,
        resumen: "Resumen B",
      })
      .expect(200);

    const resBefore = await request(app).get("/api/libros").expect(200);
    assert.equal(resBefore.body.length, 2);

    await request(app).delete("/api/libros").expect(200);

    const resAfter = await request(app).get("/api/libros").expect(200);
    assert.equal(resAfter.body.length, 0);
  });

  it("GET /api/libros?isbn=X devuelve solo el libro con ese ISBN", async () => {
    await request(app)
      .post("/api/libros")
      .send({
        isbn: "ISBN1",
        titulo: "T1",
        autores: "AU1",
        stock: 1,
        precio: 1000,
        resumen: "Resumen 1",
      })
      .expect(200);

    await request(app)
      .post("/api/libros")
      .send({
        isbn: "ISBN2",
        titulo: "T2",
        autores: "AU2",
        stock: 1,
        precio: 2000,
        resumen: "Resumen 2",
      })
      .expect(200);

    const res = await request(app)
      .get("/api/libros")
      .query({ isbn: "ISBN2" })
      .expect(200);

    assert.equal(res.body.isbn, "ISBN2");
    assert.equal(res.body.titulo, "T2");
  });

  it("GET /api/libros?titulo=T2 devuelve solo el libro con ese título", async () => {
    await request(app)
      .post("/api/libros")
      .send({
        isbn: "A1",
        titulo: "T1",
        autores: "AU1",
        stock: 1,
        precio: 1000,
        resumen: "Resumen T1",
      })
      .expect(200);

    await request(app)
      .post("/api/libros")
      .send({
        isbn: "A2",
        titulo: "T2",
        autores: "AU2",
        stock: 1,
        precio: 2000,
        resumen: "Resumen T2",
      })
      .expect(200);

    const res = await request(app)
      .get("/api/libros")
      .query({ titulo: "T2" })
      .expect(200);

    assert.equal(res.body.titulo, "T2");
    assert.equal(res.body.isbn, "A2");
  });

  describe("Excepciones y errores", () => {
    it("GET /api/libros/:id responde 404 si el libro no existe", async () => {
      // Usamos un ObjectId válido pero que no existe en la colección
      const fakeId = new Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/libros/${fakeId}`)
        .expect(404);

      assert.property(res.body, "error");
      assert.match(res.body.error, /Libro no encontrado/i);
    });
  });
});
