// /test/app-clientes-admins.spec.mjs

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

// Helper para obtener el id (id virtual o _id)
function getId(o) {
  return (o && (o.id ?? o._id))?.toString();
}

describe("API Clientes y Admins (Mongo, app.mjs)", () => {
  // Conexión global a DB de pruebas
  before(async () => {
    await connectDB();
  });

  // Limpiamos TODA la BD antes de cada test
  beforeEach(async () => {
    await clearMongoTest();
  });

  // Drop / reset final
  after(async () => {
    await resetMongoTest();
  });

  // ====================== CLIENTES ======================
  describe("Clientes", () => {
    it("POST /api/clientes crea un cliente y GET /api/clientes lo devuelve", async () => {
      const nuevo = {
        dni: "100",
        nombres: "Ana",
        apellidos: "Cliente",
        direccion: "Dir 1",
        telefono: "111",
        email: "  ANA@MAIL.COM ",
        password: "1234",
      };

      const resPost = await request(app)
        .post("/api/clientes")
        .send(nuevo)
        .expect(200);

      const creado = resPost.body;
      const creadoId = getId(creado);

      assert.ok(creadoId, "debe tener id/_id");
      assert.equal(creado.email, "ana@mail.com", "email normalizado");
      assert.equal(creado.rol, "cliente");
      assert.isUndefined(creado.password, "no debe exponer password");

      const resGetAll = await request(app).get("/api/clientes").expect(200);

      assert.isArray(resGetAll.body);
      assert.equal(resGetAll.body.length, 1);
      assert.equal(getId(resGetAll.body[0]), creadoId);
    });

    it("GET /api/clientes/:id retorna el cliente correcto", async () => {
      const { body: creado } = await request(app)
        .post("/api/clientes")
        .send({
          dni: "101",
          nombres: "Luis",
          apellidos: "Cliente",
          direccion: "Dir 2",
          telefono: "222",
          email: "luis@mail.com",
          password: "xxx",
        })
        .expect(200);

      const id = getId(creado);

      const resGet = await request(app)
        .get(`/api/clientes/${id}`)
        .expect(200);

      assert.equal(getId(resGet.body), id);
      assert.equal(resGet.body.email, "luis@mail.com");
      assert.equal(resGet.body.rol, "cliente");
    });

    it("GET /api/clientes?email=x retorna el cliente según email", async () => {
      const { body: creado } = await request(app)
        .post("/api/clientes")
        .send({
          dni: "102",
          nombres: "Marta",
          apellidos: "Cliente",
          direccion: "Dir 3",
          telefono: "333",
          email: "marta@mail.com",
          password: "zzz",
        })
        .expect(200);

      const res = await request(app)
        .get("/api/clientes")
        .query({ email: "marta@mail.com" })
        .expect(200);

      assert.equal(getId(res.body), getId(creado));
      assert.equal(res.body.email, "marta@mail.com");
    });

    it("GET /api/clientes?dni=x retorna el cliente según DNI", async () => {
      const { body: creado } = await request(app)
        .post("/api/clientes")
        .send({
          dni: "103",
          nombres: "Nico",
          apellidos: "Cliente",
          direccion: "Dir 4",
          telefono: "444",
          email: "nico@mail.com",
          password: "kkk",
        })
        .expect(200);

      const res = await request(app)
        .get("/api/clientes")
        .query({ dni: "103" })
        .expect(200);

      assert.equal(getId(res.body), getId(creado));
      assert.equal(res.body.dni, "103");
    });

    it("PUT /api/clientes reemplaza todos los clientes", async () => {
      // Estado inicial con un cliente "viejo"
      const inicial = await request(app)
        .put("/api/clientes")
        .send([
          {
            id: "OLD",
            dni: "9999",
            nombres: "Viejo",
            apellidos: "Cliente",
            direccion: "Dir Vieja",
            telefono: "000",
            email: "viejo@mail.com",
            password: "old",
          },
        ])
        .expect(200);

      assert.equal(inicial.body.length, 1);
      assert.equal(inicial.body[0].dni, "9999");
      assert.equal(inicial.body[0].rol, "cliente");
      assert.isUndefined(inicial.body[0].password);

      const nuevosDatos = [
        {
          id: "C1",
          dni: "1010",
          nombres: "Nuevo 1",
          apellidos: "Uno",
          direccion: "Dir 1",
          telefono: "111",
          email: "nuevo1@mail.com",
          password: "p1",
        },
        {
          id: "C2",
          dni: "2020",
          nombres: "Nuevo 2",
          apellidos: "Dos",
          direccion: "Dir 2",
          telefono: "222",
          email: "nuevo2@mail.com",
          password: "p2",
        },
      ];

      const resPut = await request(app)
        .put("/api/clientes")
        .send(nuevosDatos)
        .expect(200);

      const reemplazados = resPut.body;
      assert.isArray(reemplazados);
      assert.equal(reemplazados.length, 2);

      const dnis = reemplazados.map((c) => c.dni).sort();
      assert.deepEqual(dnis, ["1010", "2020"].sort());
      assert.notInclude(
        dnis,
        "9999",
        "el cliente viejo no debe seguir existiendo"
      );
      reemplazados.forEach((c) => {
        assert.equal(c.rol, "cliente");
        assert.isUndefined(c.password);
      });

      // GET /api/clientes
      const resGet = await request(app).get("/api/clientes").expect(200);
      assert.equal(resGet.body.length, 2);
      const currentDnis = resGet.body.map((c) => c.dni).sort();
      assert.deepEqual(currentDnis, ["1010", "2020"].sort());
    });

    it("PUT /api/clientes/:id actualiza un cliente existente", async () => {
      const { body: creado } = await request(app)
        .post("/api/clientes")
        .send({
          dni: "104",
          nombres: "Carlos",
          apellidos: "Viejo",
          direccion: "Dir vieja",
          telefono: "555",
          email: "carlos@mail.com",
          password: "secret",
        })
        .expect(200);

      const id = getId(creado);
      const patch = { apellidos: "Nuevo", direccion: "Dir nueva" };

      const resPut = await request(app)
        .put(`/api/clientes/${id}`)
        .send(patch)
        .expect(200);

      assert.equal(resPut.body.apellidos, "Nuevo");
      assert.equal(resPut.body.direccion, "Dir nueva");

      const resGet = await request(app)
        .get(`/api/clientes/${id}`)
        .expect(200);

      assert.equal(resGet.body.apellidos, "Nuevo");
      assert.equal(resGet.body.direccion, "Dir nueva");
    });

    it("DELETE /api/clientes/:id elimina solo el cliente indicado", async () => {
      const { body: c1 } = await request(app)
        .post("/api/clientes")
        .send({
          dni: "105",
          nombres: "Primero",
          apellidos: "C1",
          direccion: "Dir 1",
          telefono: "111",
          email: "c1@mail.com",
          password: "p1",
        })
        .expect(200);

      const { body: c2 } = await request(app)
        .post("/api/clientes")
        .send({
          dni: "106",
          nombres: "Segundo",
          apellidos: "C2",
          direccion: "Dir 2",
          telefono: "222",
          email: "c2@mail.com",
          password: "p2",
        })
        .expect(200);

      let resAll = await request(app).get("/api/clientes").expect(200);
      assert.equal(resAll.body.length, 2);

      await request(app)
        .delete(`/api/clientes/${getId(c1)}`)
        .expect(200);

      resAll = await request(app).get("/api/clientes").expect(200);

      assert.equal(resAll.body.length, 1);
      assert.equal(getId(resAll.body[0]), getId(c2));
    });

    it("DELETE /api/clientes elimina todos los clientes", async () => {
      await request(app)
        .post("/api/clientes")
        .send({
          dni: "107",
          nombres: "A",
          apellidos: "Uno",
          direccion: "Dir A",
          telefono: "111",
          email: "a@mail.com",
          password: "a1",
        })
        .expect(200);

      await request(app)
        .post("/api/clientes")
        .send({
          dni: "108",
          nombres: "B",
          apellidos: "Dos",
          direccion: "Dir B",
          telefono: "222",
          email: "b@mail.com",
          password: "b2",
        })
        .expect(200);

      const before = await request(app).get("/api/clientes").expect(200);
      assert.equal(before.body.length, 2);

      await request(app).delete("/api/clientes").expect(200);

      const after = await request(app).get("/api/clientes").expect(200);
      assert.equal(after.body.length, 0);
    });

    describe("Autenticación de clientes", () => {
      it("POST /api/clientes/autenticar autentica con credenciales correctas", async () => {
        const { body: creado } = await request(app)
          .post("/api/clientes")
          .send({
            dni: "200",
            nombres: "Login",
            apellidos: "Cliente",
            direccion: "Dir L",
            telefono: "999",
            email: "login.cliente@mail.com",
            password: "clave123",
          })
          .expect(200);

        const resAuth = await request(app)
          .post("/api/clientes/autenticar")
          .send({ email: "login.cliente@mail.com", password: "clave123" })
          .expect(200);

        assert.equal(getId(resAuth.body), getId(creado));
        assert.equal(resAuth.body.email, "login.cliente@mail.com");
        assert.equal(resAuth.body.rol, "cliente");
        assert.isUndefined(resAuth.body.password);
      });

      it("POST /api/clientes/autenticar responde 401 con password incorrecto", async () => {
        await request(app)
          .post("/api/clientes")
          .send({
            dni: "201",
            nombres: "Fail",
            apellidos: "Cliente",
            direccion: "Dir F",
            telefono: "888",
            email: "fail.cliente@mail.com",
            password: "correcta",
          })
          .expect(200);

        await request(app)
          .post("/api/clientes/autenticar")
          .send({ email: "fail.cliente@mail.com", password: "mala" })
          .expect(401);
      });

      it("POST /api/clientes/autenticar responde 401 con email inexistente", async () => {
        await request(app)
          .post("/api/clientes/autenticar")
          .send({ email: "noexiste@mail.com", password: "1234" })
          .expect(401);
      });
    });
  });

  // ====================== ADMINS ======================
  describe("Admins", () => {
    it("POST /api/admins crea un admin y GET /api/admins lo devuelve", async () => {
      const nuevo = {
        dni: "300",
        nombres: "Root",
        apellidos: "Admin",
        direccion: "Dir Admin",
        telefono: "123",
        email: "  ADMIN@MAIL.COM ",
        password: "root123",
      };

      const resPost = await request(app)
        .post("/api/admins")
        .send(nuevo)
        .expect(200);

      const admin = resPost.body;
      const adminId = getId(admin);

      assert.ok(adminId);
      assert.equal(admin.email, "admin@mail.com");
      assert.equal(admin.rol, "admin");
      assert.isUndefined(admin.password);

      const resGetAll = await request(app).get("/api/admins").expect(200);

      assert.isArray(resGetAll.body);
      assert.equal(resGetAll.body.length, 1);
      assert.equal(getId(resGetAll.body[0]), adminId);
    });

    it("GET /api/admins/:id retorna el admin correcto", async () => {
      const { body: creado } = await request(app)
        .post("/api/admins")
        .send({
          dni: "301",
          nombres: "Marta",
          apellidos: "Root",
          direccion: "Dir M",
          telefono: "555",
          email: "marta.admin@mail.com",
          password: "m123",
        })
        .expect(200);

      const id = getId(creado);

      const resGet = await request(app)
        .get(`/api/admins/${id}`)
        .expect(200);

      assert.equal(getId(resGet.body), id);
      assert.equal(resGet.body.email, "marta.admin@mail.com");
      assert.equal(resGet.body.rol, "admin");
    });

    it("GET /api/admins?email=x retorna el admin por email", async () => {
      const { body: creado } = await request(app)
        .post("/api/admins")
        .send({
          dni: "302",
          nombres: "Luis",
          apellidos: "Admin",
          direccion: "Dir L",
          telefono: "444",
          email: "luis.admin@mail.com",
          password: "l123",
        })
        .expect(200);

      const res = await request(app)
        .get("/api/admins")
        .query({ email: "luis.admin@mail.com" })
        .expect(200);

      assert.equal(getId(res.body), getId(creado));
      assert.equal(res.body.email, "luis.admin@mail.com");
    });

    it("GET /api/admins?dni=x retorna el admin por dni", async () => {
      const { body: creado } = await request(app)
        .post("/api/admins")
        .send({
          dni: "303",
          nombres: "Nico",
          apellidos: "Admin",
          direccion: "Dir N",
          telefono: "777",
          email: "nico.admin@mail.com",
          password: "n123",
        })
        .expect(200);

      const res = await request(app)
        .get("/api/admins")
        .query({ dni: "303" })
        .expect(200);

      assert.equal(getId(res.body), getId(creado));
      assert.equal(res.body.dni, "303");
    });

    it("PUT /api/admins/:id actualiza un admin existente", async () => {
      const { body: creado } = await request(app)
        .post("/api/admins")
        .send({
          dni: "304",
          nombres: "Carlos",
          apellidos: "Viejo",
          direccion: "Dir vieja",
          telefono: "999",
          email: "carlos.admin@mail.com",
          password: "c123",
        })
        .expect(200);

      const id = getId(creado);
      const patch = { apellidos: "Nuevo", direccion: "Dir nueva" };

      const resPut = await request(app)
        .put(`/api/admins/${id}`)
        .send(patch)
        .expect(200);

      assert.equal(resPut.body.apellidos, "Nuevo");
      assert.equal(resPut.body.direccion, "Dir nueva");

      const resGet = await request(app)
        .get(`/api/admins/${id}`)
        .expect(200);

      assert.equal(resGet.body.apellidos, "Nuevo");
      assert.equal(resGet.body.direccion, "Dir nueva");
    });

    it("DELETE /api/admins/:id elimina solo el admin indicado", async () => {
      const { body: a1 } = await request(app)
        .post("/api/admins")
        .send({
          dni: "305",
          nombres: "Primero",
          apellidos: "A1",
          direccion: "Dir 1",
          telefono: "111",
          email: "a1.admin@mail.com",
          password: "a1",
        })
        .expect(200);

      const { body: a2 } = await request(app)
        .post("/api/admins")
        .send({
          dni: "306",
          nombres: "Segundo",
          apellidos: "A2",
          direccion: "Dir 2",
          telefono: "222",
          email: "a2.admin@mail.com",
          password: "a2",
        })
        .expect(200);

      let resAll = await request(app).get("/api/admins").expect(200);
      assert.equal(resAll.body.length, 2);

      await request(app)
        .delete(`/api/admins/${getId(a1)}`)
        .expect(200);

      resAll = await request(app).get("/api/admins").expect(200);

      assert.equal(resAll.body.length, 1);
      assert.equal(getId(resAll.body[0]), getId(a2));
    });

    it("DELETE /api/admins elimina todos los admins", async () => {
      await request(app)
        .post("/api/admins")
        .send({
          dni: "307",
          nombres: "X",
          apellidos: "Uno",
          direccion: "Dir X",
          telefono: "111",
          email: "x.admin@mail.com",
          password: "x",
        })
        .expect(200);

      await request(app)
        .post("/api/admins")
        .send({
          dni: "308",
          nombres: "Y",
          apellidos: "Dos",
          direccion: "Dir Y",
          telefono: "222",
          email: "y.admin@mail.com",
          password: "y",
        })
        .expect(200);

      const before = await request(app).get("/api/admins").expect(200);
      assert.equal(before.body.length, 2);

      await request(app).delete("/api/admins").expect(200);

      const after = await request(app).get("/api/admins").expect(200);
      assert.equal(after.body.length, 0);
    });

    describe("Admins.autenticar", () => {
      it("POST /api/admins/autenticar autentica admin con credenciales correctas", async () => {
        const { body: admin } = await request(app)
          .post("/api/admins")
          .send({
            dni: "400",
            nombres: "Login",
            apellidos: "Admin",
            direccion: "Dir L",
            telefono: "999",
            email: "login.admin@mail.com",
            password: "clave123",
          })
          .expect(200);

        const resAuth = await request(app)
          .post("/api/admins/autenticar")
          .send({ email: "login.admin@mail.com", password: "clave123" })
          .expect(200);

        assert.equal(getId(resAuth.body), getId(admin));
        assert.equal(resAuth.body.email, "login.admin@mail.com");
        assert.equal(resAuth.body.rol, "admin");
        assert.isUndefined(resAuth.body.password);
      });

      it("POST /api/admins/autenticar responde 401 con password incorrecto", async () => {
        await request(app)
          .post("/api/admins")
          .send({
            dni: "401",
            nombres: "Fail",
            apellidos: "Admin",
            direccion: "Dir F",
            telefono: "888",
            email: "fail.admin@mail.com",
            password: "correcta",
          })
          .expect(200);

        await request(app)
          .post("/api/admins/autenticar")
          .send({ email: "fail.admin@mail.com", password: "mala" })
          .expect(401);
      });

      it("POST /api/admins/autenticar responde 401 con email inexistente", async () => {
        await request(app)
          .post("/api/admins/autenticar")
          .send({
            email: "noexiste.admin@mail.com",
            password: "1234",
          })
          .expect(401);
      });

      it("POST /api/admins/autenticar responde 401 si intenta loguearse un cliente", async () => {
        const { body: cliente } = await request(app)
          .post("/api/clientes")
          .send({
            dni: "402",
            nombres: "Cliente",
            apellidos: "Normal",
            direccion: "Dir C",
            telefono: "777",
            email: "cliente.login@mail.com",
            password: "cli123",
          })
          .expect(200);

        assert.ok(getId(cliente));

        await request(app)
          .post("/api/admins/autenticar")
          .send({ email: "cliente.login@mail.com", password: "cli123" })
          .expect(401);
      });
    });
  });
});
