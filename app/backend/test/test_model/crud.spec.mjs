// test/crud.spec.mjs
import { model } from "../../model/model.mjs";
import * as chai from "chai";
import {
  connectDB,
  clearMongoTest,
  resetMongoTest,
} from "../helpers/db_test.mjs";

const { assert } = chai;

describe("CRUD — Usuarios, Libros, Carro y Factura (Mongo)", () => {
  before(async () => {
    await connectDB();
  });

  // limpiar colecciones antes de cada test
  beforeEach(async () => {
    await clearMongoTest();
  });

  after(async () => {
    //eliminar BD de test al final
    await resetMongoTest();
  });

  describe("Usuarios", () => {
    it("addUser: crea usuario (con id) y normaliza email", async () => {
      const u = await model.users.addUser({
        dni: "11",
        nombres: "Ana",
        apellidos: "Pérez",
        direccion: "X",
        telefono: "1",
        email: "  ANA@MAIL.COM ",
        password: "123",
      });

      const id = u.id ?? u._id?.toString();
      assert.ok(id, "debería tener id");
      assert.equal(u.email, "ana@mail.com", "email normalizado a lower+trim");
    });

    it("findByEmail: encuentra por email", async () => {
      const a = await model.users.addUser({
        dni: "22",
        nombres: "Luis",
        apellidos: "Díaz",
        direccion: "C",
        telefono: "2",
        email: "luis@mail.com",
        password: "xxx",
      });

      const f = await model.users.findByEmail("luis@mail.com");
      assert.equal((f.id ?? f._id?.toString()), (a.id ?? a._id?.toString()));
    });

    it("findByEmailAndRole: solo coincide si el rol también coincide", async () => {
      await model.users.addUser({
        dni: "33",
        nombres: "Eva",
        apellidos: "Paz",
        direccion: "D",
        telefono: "3",
        email: "eva@mail.com",
        password: "yyy",
        // asumo rol por defecto 'cliente'
      });

      const ok = await model.users.findByEmailAndRole("eva@mail.com", "cliente");
      const bad = await model.users.findByEmailAndRole("eva@mail.com", "admin");
      it('findByEmailAndRole: solo coincide si el rol también coincide', async () => {
        await model.users.addUser({
          dni: '33', nombres: 'Eva', apellidos: 'Paz', direccion: 'D', telefono: '3',
          email: 'eva@mail.com', password: 'yyy'
        }); // rol por defecto = 'cliente'

        const ok = await model.users.findByEmailAndRole('eva@mail.com', 'cliente');
        const bad = await model.users.findByEmailAndRole('eva@mail.com', 'admin');

        assert.ok(ok);
        assert.isNull(bad, 'rol incorrecto no debería encontrar');
      });

    });

    it("findByDni: encuentra por DNI exacto (con trim interno)", async () => {
      const b = await model.users.addUser({
        dni: "44",
        nombres: "Marta",
        apellidos: "López",
        direccion: "Z",
        telefono: "9",
        email: "marta@mail.com",
        password: "zzz",
      });
      const f = await model.users.findByDni(" 44 ");
      assert.equal((f.id ?? f._id?.toString()), (b.id ?? b._id?.toString()));
    });

    it("getById: retorna el usuario correcto por id", async () => {
      const u = await model.users.addUser({
        dni: "55",
        nombres: "Nico",
        apellidos: "Cuevas",
        direccion: "K",
        telefono: "7",
        email: "nico@mail.com",
        password: "kkk",
      });

      const id = u.id ?? u._id?.toString();
      const g = await model.users.getById(id);
      assert.equal(g.email, "nico@mail.com");
    });

    it("updateUser: aplica patch, persiste cambios y NO devuelve password", async () => {
      const u = await model.users.addUser({
        dni: "66",
        nombres: "Mario",
        apellidos: "Lopez",
        direccion: "Antigua",
        telefono: "9",
        email: "mario@mail.com",
        password: "secreta",
      });

      const id = u.id ?? u._id?.toString();
      const safe = await model.users.updateUser(id, {
        apellidos: "López Actual",
        direccion: "Nueva Dirección",
      });

      assert.equal(safe.apellidos, "López Actual");
      assert.equal(safe.direccion, "Nueva Dirección");
      assert.isUndefined(safe.password, "no debe incluir password");

      const reread = await model.users.getById(id);
      assert.equal(reread.apellidos, "López Actual");
      assert.equal(reread.direccion, "Nueva Dirección");
    });
  });

  describe("Libros", () => {
    it("getLibros: inicia vacío", async () => {
      const all = await model.libros.getLibros();
      assert.deepEqual(all, []);
    });

    it("addLibro: agrega libro y asigna _id", async () => {
      const l = await model.libros.addLibro({
        isbn: 'A',
        titulo: 'T1',
        autores: 'AU1',
        stock: 3,
        precio: 1500,
        resumen: 'Resumen T1 de prueba',
      });
      const all = await model.libros.getLibros();
      assert.ok(l._id || l.id, "debe asignar _id");
      assert.equal(all.length, 1);
      assert.equal(
        (all[0]._id ?? all[0].id)?.toString(),
        (l._id ?? l.id)?.toString()
      );
    });

    it("getLibroPorId: recupera el libro por su _id", async () => {
      const l = await model.libros.addLibro({
        isbn: 'B',
        titulo: 'T2',
        autores: 'AU2',
        stock: 2,
        precio: 2500,
        resumen: 'Resumen T2 de prueba',
      });

      const id = l._id ?? l.id;
      const got = await model.libros.getLibroPorId(id);
      assert.equal(got.titulo, "T2");
    });

    it("updateLibro: modifica campos en un libro existente", async () => {
      const l = await model.libros.addLibro({
        isbn: 'C',
        titulo: 'Viejo',
        autores: 'AU',
        stock: 1,
        precio: 1000,
        resumen: 'Resumen viejo',
      });

      const id = l._id ?? l.id;
      const mod = await model.libros.updateLibro(id, {
        titulo: "Nuevo",
        stock: 5,
        precio: 1800,
      });

      assert.equal(mod.titulo, "Nuevo");
      assert.equal(mod.stock, 5);
      assert.equal(mod.precio, 1800);

      const reread = await model.libros.getLibroPorId(id);
      assert.equal(reread.titulo, "Nuevo");
    });

    it("removeLibro: elimina por id y no queda accesible", async () => {
      const l = await model.libros.addLibro({
        isbn: 'D',
        titulo: 'T3',
        autores: 'AU3',
        stock: 4,
        precio: 900,
        resumen: 'Resumen T3 test',
      });

      const id = l._id ?? l.id;
      await model.libros.removeLibro(id);

      const got = await model.libros.getLibroPorId(id);
      // Antes: assert.isUndefined(got);
      assert.isNotOk(got, "no debería retornar el libro eliminado"); // acepta null/undefined

      const all = await model.libros.getLibros();
      assert.equal(all.length, 0);
    });
  });

  describe("CartStore", () => {
    let USER_ID;
    let L1_ID;
    let L2_ID;

    beforeEach(async () => {
      // Usuario de prueba para el carrito (usuario es ObjectId en Mongo)
      const u = await model.users.addUser({
        dni: "999",
        nombres: "Carrito",
        apellidos: "Test",
        direccion: "X",
        telefono: "1",
        email: "cart@test.com",
        password: "1234",
      });
      USER_ID = (u.id ?? u._id)?.toString();

      // Libros de prueba con stock y precio conocidos
      const l1 = await model.libros.addLibro({
        isbn: "1",
        titulo: "A",
        autores: "X",
        stock: 3,
        precio: 1000,
        resumen: "Resumen L1 test",
      });

      const l2 = await model.libros.addLibro({
        isbn: "2",
        titulo: "B",
        autores: "Y",
        stock: 5,
        precio: 2500,
        resumen: "Resumen L2 test",
      });

      L1_ID = (l1.id ?? l1._id)?.toString();
      L2_ID = (l2.id ?? l2._id)?.toString();
    });

    it("get: retorna items con subtotal por item y totales (subtotal, iva 4%, total)", async () => {
      await model.carts.add(USER_ID, L1_ID, 2); // 2 * 1000 = 2000
      await model.carts.add(USER_ID, L2_ID, 1); // 1 * 2500 = 2500

      const cart = await model.carts.get(USER_ID);

      assert.isArray(cart.items);
      assert.equal(cart.items.length, 2);

      const i1 = cart.items.find((i) => i.libroId === L1_ID);
      const i2 = cart.items.find((i) => i.libroId === L2_ID);

      assert.equal(i1.subtotal, 2000);
      assert.equal(i2.subtotal, 2500);

      const expectedSubtotal = 2000 + 2500; // 4500
      const IVA = 0.04;
      const expectedIva = expectedSubtotal * IVA;
      const expectedTotal = expectedSubtotal + expectedIva;

      assert.equal(cart.subtotal, expectedSubtotal);
      assert.closeTo(cart.iva, expectedIva, 1e-9);
      assert.closeTo(cart.total, expectedTotal, 1e-9);
      assert.equal(cart.ivaRate, IVA);
    });

    it("add: crea item si no existe y acumula cantidad hasta el tope de stock", async () => {
      // L1 tiene stock 3
      await model.carts.add(USER_ID, L1_ID, 1);
      let cart = await model.carts.add(USER_ID, L1_ID, 5);
      const it = cart.items.find((i) => i.libroId === L1_ID);
      assert.equal(it.cantidad, 3);

      // agregar un segundo libro empieza en 1
      cart = await model.carts.add(USER_ID, L2_ID, 1);
      const it2 = cart.items.find((i) => i.libroId === L2_ID);
      assert.equal(it2.cantidad, 1);
    });

    it("setQty: fija cantidad en [0, stock]; si 0 elimina el item", async () => {
      // Prepara un item con stock conocido (L2 stock = 5)
      await model.carts.add(USER_ID, L2_ID, 1);

      // subir por sobre el stock -> queda en 5
      let cart = await model.carts.setQty(USER_ID, L2_ID, 99);
      assert.equal(
        cart.items.find((i) => i.libroId === L2_ID).cantidad,
        5,
      );

      // bajar a 0 -> debe eliminar
      cart = await model.carts.setQty(USER_ID, L2_ID, 0);
      assert.isUndefined(cart.items.find((i) => i.libroId === L2_ID));
    });

    it("remove: elimina el item y actualiza totales", async () => {
      await model.carts.add(USER_ID, L1_ID, 2); // 2000
      await model.carts.add(USER_ID, L2_ID, 1); // 2500

      const before = await model.carts.get(USER_ID);

      // remove L1
      const cart = await model.carts.remove(USER_ID, L1_ID);
      assert.isUndefined(cart.items.find((i) => i.libroId === L1_ID));

      const expectedSubtotal = 2500;
      const IVA = 0.04;
      const expectedIva = expectedSubtotal * IVA;
      const expectedTotal = expectedSubtotal + expectedIva;

      assert.equal(cart.subtotal, expectedSubtotal);
      assert.closeTo(cart.iva, expectedIva, 1e-9);
      assert.closeTo(cart.total, expectedTotal, 1e-9);

      assert.equal(before.items.length, 2);
      assert.equal(cart.items.length, 1);
    });

    it("clear: vacía el carrito del usuario", async () => {
      await model.carts.add(USER_ID, L1_ID, 1);
      await model.carts.add(USER_ID, L2_ID, 1);

      await model.carts.clear(USER_ID);

      const cart = await model.carts.get(USER_ID);
      assert.equal(cart.items.length, 0);
      assert.equal(cart.subtotal, 0);
      assert.equal(cart.iva, 0);
      assert.equal(cart.total, 0);
    });
  });


  describe("Factura", () => {
    let USER_ID;
    let L1_ID;
    let L2_ID;

    beforeEach(async () => {
      // clearMongoTest ya corrió arriba

      const u = await model.users.addUser({
        dni: "888",
        nombres: "Factura",
        apellidos: "Test",
        direccion: "Z",
        telefono: "1",
        email: "fact@test.com",
        password: "abcd",
      });
      USER_ID = (u.id ?? u._id)?.toString();

      const l1 = await model.libros.addLibro({
        isbn: "1",
        titulo: "A",
        autores: "X",
        stock: 3,
        precio: 1000,
        resumen: "Resumen factura L1",
      });
      const l2 = await model.libros.addLibro({
        isbn: "2",
        titulo: "B",
        autores: "Y",
        stock: 5,
        precio: 2500,
        resumen: "Resumen factura L2",
      });

      L1_ID = (l1.id ?? l1._id)?.toString();
      L2_ID = (l2.id ?? l2._id)?.toString();
    });

    it("createFromCart: copia items y totales del carrito y lo limpia", async () => {
      await model.carts.add(USER_ID, L1_ID, 2); // 2000
      await model.carts.add(USER_ID, L2_ID, 1); // 2500

      const before = await model.carts.get(USER_ID);

      const meta = {
        razonSocial: "Mi Pyme",
        direccion: "Calle 1",
        dni: "55",
        email: "c@c",
      };
      const fac = await model.facturas.createFromCart(USER_ID, meta);

      assert.ok(fac.id || fac._id, "factura debe tener id");
      assert.ok(fac.fechaISO, "factura debe tener fechaISO");
      assert.equal(fac.meta.razonSocial, meta.razonSocial);

      assert.equal(fac.subtotal, before.subtotal);
      assert.closeTo(fac.iva, before.iva, 1e-9);
      assert.closeTo(fac.total, before.total, 1e-9);
      assert.equal(fac.ivaRate, before.ivaRate);

      assert.equal(fac.items.length, before.items.length);
      assert.equal(fac.items[0].subtotal, before.items[0].subtotal);

      const after = await model.carts.get(USER_ID);
      assert.equal(after.items.length, 0);
      assert.equal(after.subtotal, 0);
      assert.equal(after.iva, 0);
      assert.equal(after.total, 0);
    });

    it("getAll: retorna todas las facturas del usuario (orden luego de 2 compras)", async () => {
      await model.carts.add(USER_ID, L1_ID, 1);
      const f1 = await model.facturas.createFromCart(USER_ID, {
        razonSocial: "R1",
        direccion: "Dir 1",
        dni: "11",
        email: "r1@mail.com",
      });

      await model.carts.add(USER_ID, L2_ID, 2);
      const f2 = await model.facturas.createFromCart(USER_ID, {
        razonSocial: "R2",
        direccion: "Dir 2",
        dni: "22",
        email: "r2@mail.com",
      });

      const todas = await model.facturas.getAll(USER_ID);

      assert.equal(todas.length, 2);

      const ids = todas.map((f) => f.id ?? f._id?.toString());

      // Contiene ambas facturas, sin asumir orden
      const f1Id = f1.id ?? f1._id?.toString();
      const f2Id = f2.id ?? f2._id?.toString();

      assert.includeMembers(ids, [f1Id, f2Id]);
    });


    it("getById: recupera la factura correcta por id", async () => {
      await model.carts.add(USER_ID, L1_ID, 2);
      const fac = await model.facturas.createFromCart(USER_ID, {
        razonSocial: "RZ",
        direccion: "Dir Z",
        dni: "99",
        email: "rz@mail.com",
      });

      const got = await model.facturas.getById(USER_ID, fac.id);
      assert.ok(got);
      assert.equal(got.id, fac.id);
      assert.equal(got.total, fac.total);
      assert.equal(got.meta.razonSocial, "RZ");
    });
  });


});
