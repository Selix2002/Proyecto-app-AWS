import { model } from "../../model/model.mjs";
import mongoose from "mongoose";
import * as chai from "chai";
const { Types } = mongoose;
import {
  connectDB,
  clearMongoTest,
  resetMongoTest,
} from "../helpers/db_test.mjs";

const { assert } = chai;

// Helper para verificar que una función async (o que devuelve Promise)
// lanza un error cuyo mensaje matchee el regex dado.
async function expectError(fn, regex) {
  try {
    await fn();
    assert.fail("Debería lanzar error, pero no lo hizo");
  } catch (err) {
    assert.match(err.message, regex);
  }
}

describe("Excepciones (Mongo)", () => {
  before(async () => {
    await connectDB();
  });

  // Limpia TODAS las colecciones antes de cada test
  beforeEach(async () => {
    await clearMongoTest();
  });

  after(async () => {
    await resetMongoTest();
  });

  // ===================== USERS =====================
  describe("Users", () => {
    it("Users.addUser lanza si falta un campo requerido", async () => {
      await expectError(
        () => model.users.addUser({}),
        /Falta el campo:/,
      );
    });

    it("Users.addUser lanza por email duplicado y por DNI duplicado", async () => {
      await model.users.addUser({
        dni: "1",
        nombres: "A",
        apellidos: "B",
        direccion: "x",
        telefono: "1",
        email: "a@mail.com",
        password: "123",
      });

      await expectError(
        () =>
          model.users.addUser({
            dni: "2",
            nombres: "C",
            apellidos: "D",
            direccion: "x",
            telefono: "1",
            email: "a@mail.com",
            password: "123",
          }),
        /El correo ya está registrado/,
      );

      await expectError(
        () =>
          model.users.addUser({
            dni: "1",
            nombres: "E",
            apellidos: "F",
            direccion: "x",
            telefono: "1",
            email: "e@mail.com",
            password: "123",
          }),
        /El DNI ya está registrado/,
      );
    });

    it("Users.updateUser lanza si el id no existe", async () => {
      const fakeId = new Types.ObjectId().toString(); // id válido pero no existente

      await expectError(
        () => model.users.updateUser(fakeId, { nombres: "Z" }),
        /Usuario no encontrado/,
      );
    });


    // ---- Users.validate (login) ----
    describe("Users.validate (login)", () => {
      // Este beforeEach corre DESPUES del clearMongoTest global
      beforeEach(async () => {
        await model.users.addUser({
          dni: "9",
          nombres: "Test",
          apellidos: "User",
          direccion: "X",
          telefono: "1",
          email: "test@mail.com",
          password: "1234", // rol por defecto = 'cliente'
        });
      });

      it("devuelve el usuario cuando email, password y rol son correctos", async () => {
        const ok = await model.users.validate("test@mail.com", "1234", "cliente");
        assert.isOk(ok, "debería autenticar correctamente");
      });

      it("retorna null cuando la contraseña es incorrecta", async () => {
        const res = await model.users.validate("test@mail.com", "mala", "cliente");
        assert.isNull(res, "con password incorrecto debe retornar null");
      });

      it("retorna null cuando el correo no existe / es incorrecto", async () => {
        const res = await model.users.validate("noexiste@mail.com", "1234", "cliente");
        assert.isNull(res, "con email incorrecto debe retornar null");
      });

      it("retorna null cuando el rol no coincide", async () => {
        const res = await model.users.validate("test@mail.com", "1234", "admin");
        assert.isNull(res, "con rol incorrecto debe retornar null");
      });
    });
  });

  // ===================== LIBROS =====================
  describe("Libros", () => {
    // clearMongoTest ya dejó la DB vacía antes de cada test

    it("Libros.update/remove lanza si el libro no existe", async () => {
      const fakeId = new Types.ObjectId().toString();

      await expectError(
        () => model.libros.updateLibro(fakeId, { titulo: "T" }),
        /Libro no encontrado/i,
      );
      await expectError(
        () => model.libros.removeLibro(fakeId),
        /Libro no encontrado/i,
      );
    });


    it("addLibro lanza si falta isbn", async () => {
      await expectError(
        () =>
          model.libros.addLibro({
            // falta isbn
            titulo: "T1",
            autores: "AU",
            stock: 1,
            precio: 1000,
          }),
        /Falta el campo:/,
      );
    });

    it("addLibro lanza si falta titulo", async () => {
      await expectError(
        () =>
          model.libros.addLibro({
            isbn: "X1", // falta titulo
            autores: "AU",
            stock: 1,
            precio: 1000,
          }),
        /Falta el campo:/,
      );
    });

    it("addLibro lanza si falta autores", async () => {
      await expectError(
        () =>
          model.libros.addLibro({
            isbn: "X2",
            titulo: "T1", // falta autores
            stock: 1,
            precio: 1000,
          }),
        /Falta el campo:/,
      );
    });

    it("addLibro lanza si stock es 0 o negativo", async () => {
      await expectError(
        () =>
          model.libros.addLibro({
            isbn: "X3",
            titulo: "T1",
            autores: "AU",
            stock: 0,
            precio: 1000,
          }),
        /Stock inválido/,
      );

      await expectError(
        () =>
          model.libros.addLibro({
            isbn: "X4",
            titulo: "T1",
            autores: "AU",
            stock: -5,
            precio: 1000,
          }),
        /Stock inválido/,
      );
    });

    it("addLibro lanza si precio es 0 o negativo", async () => {
      await expectError(
        () =>
          model.libros.addLibro({
            isbn: "X5",
            titulo: "T1",
            autores: "AU",
            stock: 1,
            precio: 0,
          }),
        /Precio inválido/i,
      );

      await expectError(
        () =>
          model.libros.addLibro({
            isbn: "X6",
            titulo: "T1",
            autores: "AU",
            stock: 1,
            precio: -10,
          }),
        /Precio inválido/i,
      );
    });

    it("addLibro lanza si stock no es entero o no es numérico", async () => {
      await expectError(
        () =>
          model.libros.addLibro({
            isbn: "X7",
            titulo: "T1",
            autores: "AU",
            stock: 1.5,
            precio: 1000,
          }),
        /Stock inválido/,
      );

      await expectError(
        () =>
          model.libros.addLibro({
            isbn: "X8",
            titulo: "T1",
            autores: "AU",
            stock: "no-num",
            precio: 1000,
          }),
        /Stock inválido/,
      );
    });

    it("addLibro lanza si precio no es numérico", async () => {
      await expectError(
        () =>
          model.libros.addLibro({
            isbn: "X9",
            titulo: "T1",
            autores: "AU",
            stock: 1,
            precio: "caro",
          }),
        /Precio inválido/i,
      );
    });

    it("addLibro lanza si el ISBN ya existe", async () => {
      // Primer libro: válido
      await model.libros.addLibro({
        isbn: "DUP",
        titulo: "A",
        autores: "AU",
        stock: 1,
        precio: 1000,
        resumen: "Resumen DUP",
      });

      // Segundo libro: mismo ISBN -> debe lanzar por duplicado
      await expectError(
        () =>
          model.libros.addLibro({
            isbn: "DUP",
            titulo: "B",
            autores: "AU2",
            stock: 2,
            precio: 2000,
            resumen: "Otro resumen",
          }),
        /El ISBN ya existe/i,
      );
    });

  });

  // ===================== CARRITO =====================
  describe("Carrito", () => {
    let USER_ID;
    let libroId;

    beforeEach(async () => {
      // Usuario real para el carrito (usuario es ObjectId en Mongo)
      const u = await model.users.addUser({
        dni: "555",
        nombres: "Carrito",
        apellidos: "Excepcion",
        direccion: "X",
        telefono: "1",
        email: "cart-exc@test.com",
        password: "1234",
      });
      USER_ID = (u.id ?? u._id)?.toString();

      // Libro de prueba con resumen
      const l = await model.libros.addLibro({
        isbn: "1",
        titulo: "A",
        autores: "X",
        stock: 3,
        precio: 1000,
        resumen: "Resumen test carrito",
      });
      libroId = (l.id ?? l._id)?.toString();
    });

    it("Cart.setQty lanza si cantidad es negativa, no numérica o infinita", async () => {
      const userId = USER_ID;
      await model.carts.add(userId, libroId, 1);

      await expectError(
        () => model.carts.setQty(userId, libroId, -2),
        /Cantidad inválida/,
      );
      await expectError(
        () => model.carts.setQty(userId, libroId, "mucho"),
        /Cantidad inválida/,
      );
      await expectError(
        () => model.carts.setQty(userId, libroId, Infinity),
        /Cantidad inválida/,
      );
    });

    it("Cart.inc/dec lanza si el item no existe en el carrito", async () => {
      const userId = USER_ID;

      await expectError(
        () => model.carts.inc(userId, libroId),
        /Item no encontrado/,
      );
      await expectError(
        () => model.carts.dec(userId, libroId),
        /Item no encontrado/,
      );
    });

    it("Cart.remove lanza si el item no existe", async () => {
      const userId = USER_ID;

      await expectError(
        () => model.carts.remove(userId, libroId),
        /Item no encontrado/,
      );
    });
  });


  // ===================== FACTURA =====================
  describe("Factura", () => {
    let USER_ID;
    let libroId;

    beforeEach(async () => {
      // Usuario de prueba
      const u = await model.users.addUser({
        dni: "666",
        nombres: "Factura",
        apellidos: "Excepcion",
        direccion: "Z",
        telefono: "1",
        email: "fact-exc@test.com",
        password: "abcd",
      });
      USER_ID = (u.id ?? u._id)?.toString();

      // Libro de prueba con resumen
      const l = await model.libros.addLibro({
        isbn: "1",
        titulo: "A",
        autores: "X",
        stock: 3,
        precio: 1000,
        resumen: "Resumen test factura",
      });
      libroId = (l.id ?? l._id)?.toString();
    });

    it("Factura.createFromCart lanza si el carrito está vacío", async () => {
      const meta = {
        razonSocial: "Test RS",
        direccion: "Calle X",
        dni: "11",
        email: "test@mail.com",
      };
      
      await expectError(
        () => model.facturas.createFromCart(USER_ID, meta),
        /Carrito vacío/,
      );
    });


    it("Factura.createFromCart lanza si userId no existe o es null", async () => {
      await expectError(
        () => model.facturas.createFromCart(null),
        /ID de usuario no existe/,
      );
    });

    it("Factura.createFromCart lanza si la información está incompleta", async () => {
      // Prepara carrito con items
      await model.carts.add(USER_ID, libroId, 2);

      await expectError(
        () =>
          model.facturas.createFromCart(USER_ID, {
            direccion: "x",
            dni: "1",
            email: "a@mail.com",
          }),
        /Razón social/i,
      );

      await expectError(
        () =>
          model.facturas.createFromCart(USER_ID, {
            razonSocial: "X",
            dni: "1",
            email: "a@mail.com",
          }),
        /dirección/i,
      );

      await expectError(
        () =>
          model.facturas.createFromCart(USER_ID, {
            razonSocial: "X",
            direccion: "x",
            email: "a@mail.com",
          }),
        /dni/i,
      );

      await expectError(
        () =>
          model.facturas.createFromCart(USER_ID, {
            razonSocial: "X",
            direccion: "x",
            dni: "1",
          }),
        /email/i,
      );
    });
  });

});
