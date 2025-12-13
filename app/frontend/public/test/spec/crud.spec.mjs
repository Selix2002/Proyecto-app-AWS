import { proxy } from "../../libreria/js/model/proxy.mjs";
import * as chai from "../chai.js";

const { assert } = chai;

describe("HTTP - Proxy", () => {
  
  describe("Proxy HTTP — Libros (CRUD)", () => {
    beforeEach(async () => {
      await proxy.removeLibros(); // limpia colección
    });

    it("getLibros: inicia vacío", async () => {
      const libros = await proxy.getLibros();
      assert.isArray(libros);
      assert.deepEqual(libros, []);
    });

    it("addLibro: agrega libro y asigna _id", async () => {
      const nuevo = {
        isbn: "A",
        titulo: "T1",
        autores: "AU1",
        stock: 3,
        precio: 1500,
        resumen: "Resumen T1",
      };

      const l = await proxy.addLibro(nuevo);
      assert.ok(l._id, "debe asignar _id");
      assert.equal(l.titulo, "T1");

      const all = await proxy.getLibros();
      assert.equal(all.length, 1);
      assert.equal(all[0]._id, l._id);
    });

    it("getLibroPorId: recupera el libro por su _id", async () => {
      const creado = await proxy.addLibro({
        isbn: "B",
        titulo: "T2",
        autores: "AU2",
        stock: 2,
        precio: 2500,
        resumen: "Resumen T2",
      });

      const got = await proxy.getLibroPorId(creado._id);
      assert.ok(got);
      assert.equal(got._id, creado._id);
      assert.equal(got.titulo, "T2");
    });

    it("updateLibro: modifica campos en un libro existente", async () => {
      const creado = await proxy.addLibro({
        isbn: "C",
        titulo: "Viejo",
        autores: "AU",
        stock: 1,
        precio: 1000,
        resumen: "Resumen viejo",
      });

      const mod = await proxy.updateLibro(creado._id, {
        titulo: "Nuevo",
        stock: 5,
        precio: 1800,
      });

      assert.equal(mod.titulo, "Nuevo");
      assert.equal(mod.stock, 5);
      assert.equal(mod.precio, 1800);

      const reread = await proxy.getLibroPorId(creado._id);
      assert.equal(reread.titulo, "Nuevo");
      assert.equal(reread.stock, 5);
      assert.equal(reread.precio, 1800);
    });

    it("removeLibro: elimina por id y no queda accesible", async () => {
      const creado = await proxy.addLibro({
        isbn: "D",
        titulo: "T3",
        autores: "AU3",
        stock: 4,
        precio: 900,
        resumen: "Resumen T3",
      });

      await proxy.removeLibro(creado._id);

      const all = await proxy.getLibros();
      assert.equal(all.length, 0, "no debe quedar ningún libro");
    });

    it("removeLibros: elimina todos los libros", async () => {
      await proxy.addLibro({
        isbn: "E",
        titulo: "T4",
        autores: "AU4",
        stock: 2,
        precio: 500,
        resumen: "Resumen T4",
      });
      await proxy.addLibro({
        isbn: "F",
        titulo: "T5",
        autores: "AU5",
        stock: 3,
        precio: 600,
        resumen: "Resumen T5",
      });

      let all = await proxy.getLibros();
      assert.equal(all.length, 2);

      await proxy.removeLibros();
      all = await proxy.getLibros();
      assert.equal(all.length, 0);
    });

    it("setLibros: reemplaza toda la colección y elimina los anteriores", async () => {
      await proxy.addLibro({
        isbn: "OLD",
        titulo: "Viejo",
        autores: "Autor Viejo",
        stock: 1,
        precio: 100,
        resumen: "Resumen viejo",
      });

      let all = await proxy.getLibros();
      assert.equal(all.length, 1);

      const nuevosDatos = [
        {
          isbn: "S1",
          titulo: "Nuevo 1",
          autores: "A1",
          stock: 2,
          precio: 1000,
          resumen: "Resumen N1",
        },
        {
          isbn: "S2",
          titulo: "Nuevo 2",
          autores: "A2",
          stock: 3,
          precio: 2000,
          resumen: "Resumen N2",
        },
      ];

      const reemplazados = await proxy.setLibros(nuevosDatos);

      assert.isArray(reemplazados);
      assert.equal(reemplazados.length, 2);

      const titulos = reemplazados.map((l) => l.titulo);
      assert.include(titulos, "Nuevo 1");
      assert.include(titulos, "Nuevo 2");
      assert.notInclude(titulos, "Viejo");

      all = await proxy.getLibros();
      assert.equal(all.length, 2);
    });

    it("getLibroPorIsbn: recupera el libro correcto por ISBN", async () => {
      const l1 = await proxy.addLibro({
        isbn: "ISBN-123",
        titulo: "Libro ISBN 123",
        autores: "Autor 1",
        stock: 5,
        precio: 3000,
        resumen: "Resumen 123",
      });

      await proxy.addLibro({
        isbn: "ISBN-456",
        titulo: "Otro libro",
        autores: "Autor 2",
        stock: 2,
        precio: 1500,
        resumen: "Resumen 456",
      });

      const got = await proxy.getLibroPorIsbn("ISBN-123");
      assert.ok(got);
      assert.equal(got._id, l1._id);
      assert.equal(got.isbn, "ISBN-123");
      assert.equal(got.titulo, "Libro ISBN 123");
    });

    it("getLibroPorTítulo: recupera el libro correcto por título exacto", async () => {
      const tituloBuscado = "Mi Título Especial";

      const l1 = await proxy.addLibro({
        isbn: "Z1",
        titulo: tituloBuscado,
        autores: "Autor Especial",
        stock: 4,
        precio: 5000,
        resumen: "Resumen especial",
      });

      await proxy.addLibro({
        isbn: "Z2",
        titulo: "Otro Título",
        autores: "Autor 2",
        stock: 1,
        precio: 800,
        resumen: "Resumen otro",
      });

      const got = await proxy.getLibroPorTitulo(tituloBuscado);
      assert.ok(got);
      assert.equal(got._id, l1._id);
      assert.equal(got.titulo, tituloBuscado);
      assert.equal(got.isbn, "Z1");
    });
  });

  // ============================================================
  // CLIENTES + ADMINS
  // ============================================================
  describe("Proxy HTTP — Clientes (CRUD + auth)", () => {
    beforeEach(async () => {
      await proxy.removeClientes();
    });

    it("addCliente: crea cliente (rol cliente) y normaliza email", async () => {
      const c = await proxy.addCliente({
        dni: "11",
        nombres: "Ana",
        apellidos: "Pérez",
        direccion: "Calle X",
        telefono: "123",
        email: "  ANA@MAIL.COM ",
        password: "secreta",
      });

      assert.ok(c.id, "debería tener id");
      assert.equal(c.email, "ana@mail.com", "email normalizado a lower+trim");
      assert.equal(c.rol, "cliente", "rol por defecto cliente");
      assert.isUndefined(c.password, "no debe exponer password");
    });

    it("getClientes: retorna todos los clientes existentes", async () => {
      await proxy.addCliente({
        dni: "22",
        nombres: "Luis",
        apellidos: "Díaz",
        direccion: "Dir 1",
        telefono: "111",
        email: "luis@mail.com",
        password: "xxx",
      });

      await proxy.addCliente({
        dni: "33",
        nombres: "Eva",
        apellidos: "Paz",
        direccion: "Dir 2",
        telefono: "222",
        email: "eva@mail.com",
        password: "yyy",
      });

      const clientes = await proxy.getClientes();

      assert.isArray(clientes);
      assert.equal(clientes.length, 2);
      clientes.forEach((c) => {
        assert.equal(c.rol, "cliente");
        assert.isUndefined(c.password);
      });
    });

    it("getClientePorId: obtiene el cliente correcto por id", async () => {
      const creado = await proxy.addCliente({
        dni: "44",
        nombres: "Marta",
        apellidos: "López",
        direccion: "Dir Z",
        telefono: "999",
        email: "marta@mail.com",
        password: "zzz",
      });

      const got = await proxy.getClientePorId(creado.id);

      assert.ok(got);
      assert.equal(got.id, creado.id);
      assert.equal(got.email, "marta@mail.com");
      assert.equal(got.nombres, "Marta");
      assert.isUndefined(got.password);
    });

    it("getClientePorEmail: busca por email normalizado", async () => {
      const creado = await proxy.addCliente({
        dni: "55",
        nombres: "Nico",
        apellidos: "Cuevas",
        direccion: "Dir K",
        telefono: "777",
        email: "  NICO@MAIL.COM ",
        password: "kkk",
      });

      const got = await proxy.getClientePorEmail("nico@mail.com");

      assert.ok(got);
      assert.equal(got.id, creado.id);
      assert.equal(got.email, "nico@mail.com");
      assert.equal(got.rol, "cliente");
    });

    it("getClientePorDni: busca por DNI exacto", async () => {
      const creado = await proxy.addCliente({
        dni: "66",
        nombres: "Mario",
        apellidos: "López",
        direccion: "Dir M",
        telefono: "333",
        email: "mario@mail.com",
        password: "mmm",
      });

      const got = await proxy.getClientePorDni("66");

      assert.ok(got);
      assert.equal(got.id, creado.id);
      assert.equal(got.dni, "66");
      assert.equal(got.nombres, "Mario");
    });

it("setClientes: reemplaza todos los clientes y elimina los anteriores", async () => {
  // 1) Primer set: creamos un cliente "viejo" y guardamos su id real
  const iniciales = await proxy.setClientes([
    {
      id: "OLD", // Mongo lo va a ignorar, pero da igual
      dni: "9999",
      nombres: "Viejo",
      apellidos: "Cliente",
      direccion: "Dir Vieja",
      telefono: "000",
      email: "viejo@mail.com",
      password: "old",
    },
  ]);

  assert.isArray(iniciales);
  assert.equal(iniciales.length, 1);

  const oldId = iniciales[0].id;   // este es el id real de Mongo
  assert.ok(oldId, "debe venir con un id generado");

  // 2) Segundo set: reemplazamos completamente la colección
  const nuevosDatos = [
    {
      id: "C1", // el backend ya no respeta esto como id real
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

  const reemplazados = await proxy.setClientes(nuevosDatos);

  assert.isArray(reemplazados);
  assert.equal(reemplazados.length, 2);

  // Los nuevos deben tener rol cliente y no exponer password
  reemplazados.forEach((c) => {
    assert.equal(c.rol, "cliente");
    assert.isUndefined(c.password);
  });

  const nombres = reemplazados.map((c) => c.nombres).sort();
  assert.deepEqual(
    nombres,
    ["Nuevo 1", "Nuevo 2"].sort(),
    "deben ser exactamente los nuevos clientes"
  );

  // 3) Verificamos contra lo que hay persistido ahora
  const actuales = await proxy.getClientes();
  assert.equal(actuales.length, 2);

  const actualesIds = actuales.map((c) => c.id);
  // Ningún cliente actual debe tener el id viejo
  assert.notInclude(
    actualesIds,
    oldId,
    "el cliente viejo no debe seguir existiendo"
  );
});


    it("removeClientes: elimina todos los clientes", async () => {
      await proxy.addCliente({
        dni: "71",
        nombres: "A",
        apellidos: "Uno",
        direccion: "Dir A",
        telefono: "111",
        email: "a@mail.com",
        password: "a",
      });

      await proxy.addCliente({
        dni: "72",
        nombres: "B",
        apellidos: "Dos",
        direccion: "Dir B",
        telefono: "222",
        email: "b@mail.com",
        password: "b",
      });

      let clientes = await proxy.getClientes();
      assert.equal(clientes.length, 2);

      const resp = await proxy.removeClientes();
      if (resp && typeof resp === "object") {
        assert.property(resp, "ok");
      }

      clientes = await proxy.getClientes();
      assert.equal(clientes.length, 0);
    });

    it("updateCliente: aplica patch, persiste cambios y NO devuelve password", async () => {
      const creado = await proxy.addCliente({
        dni: "80",
        nombres: "Carlos",
        apellidos: "Antiguo",
        direccion: "Dir vieja",
        telefono: "555",
        email: "carlos@mail.com",
        password: "secret",
      });

      const actualizado = await proxy.updateCliente(creado.id, {
        apellidos: "Actualizado",
        direccion: "Dir nueva",
      });

      assert.equal(actualizado.apellidos, "Actualizado");
      assert.equal(actualizado.direccion, "Dir nueva");
      assert.equal(actualizado.id, creado.id);
      assert.isUndefined(actualizado.password, "no debe exponer password");

      const reread = await proxy.getClientePorId(creado.id);
      assert.equal(reread.apellidos, "Actualizado");
      assert.equal(reread.direccion, "Dir nueva");
    });

    it("removeCliente: elimina solo el cliente indicado", async () => {
      const c1 = await proxy.addCliente({
        dni: "91",
        nombres: "Primero",
        apellidos: "Uno",
        direccion: "Dir 1",
        telefono: "111",
        email: "primero@mail.com",
        password: "p1",
      });

      const c2 = await proxy.addCliente({
        dni: "92",
        nombres: "Segundo",
        apellidos: "Dos",
        direccion: "Dir 2",
        telefono: "222",
        email: "segundo@mail.com",
        password: "p2",
      });

      let clientes = await proxy.getClientes();
      assert.equal(clientes.length, 2);

      const resp = await proxy.removeCliente(c1.id);
      if (resp && typeof resp === "object") {
        assert.property(resp, "ok");
      }

      clientes = await proxy.getClientes();
      assert.equal(clientes.length, 1);
      assert.equal(clientes[0].id, c2.id);
    });

    it("autenticarCliente: retorna cliente seguro con credenciales válidas", async () => {
      const creado = await proxy.addCliente({
        dni: "100",
        nombres: "Login",
        apellidos: "User",
        direccion: "Dir login",
        telefono: "999",
        email: "login@mail.com",
        password: "clave123",
      });

      const auth = await proxy.autenticarCliente({
        email: "login@mail.com",
        password: "clave123",
      });

      assert.ok(auth);
      assert.equal(auth.id, creado.id);
      assert.equal(auth.email, "login@mail.com");
      assert.equal(auth.rol, "cliente");
      assert.isUndefined(auth.password);
    });

    // ------------------ ADMINS ------------------
    describe("Admins", () => {
      beforeEach(async () => {
        const existentes = await proxy.getAdmins();
        await Promise.all(existentes.map((a) => proxy.removeAdmin(a.id)));
      });

      it("addAdmin: crea admin (rol admin) y normaliza email", async () => {
        const admin = await proxy.addAdmin({
          dni: "900",
          nombres: "Root",
          apellidos: "Admin",
          direccion: "Oficina Central",
          telefono: "123456",
          email: "  ADMIN@MAIL.COM ",
          password: "secreta",
        });

        assert.ok(admin.id, "debería tener id");
        assert.equal(admin.email, "admin@mail.com");
        assert.equal(admin.rol, "admin");
        assert.isUndefined(admin.password);
      });

      it("getAdmins: retorna todos los administradores existentes", async () => {
        await proxy.addAdmin({
          dni: "901",
          nombres: "Ana",
          apellidos: "Admin",
          direccion: "Dir 1",
          telefono: "111",
          email: "ana.admin@mail.com",
          password: "a1",
        });

        await proxy.addAdmin({
          dni: "902",
          nombres: "Luis",
          apellidos: "Root",
          direccion: "Dir 2",
          telefono: "222",
          email: "luis.root@mail.com",
          password: "a2",
        });

        const admins = await proxy.getAdmins();

        assert.isArray(admins);
        assert.equal(admins.length, 2);
        admins.forEach((a) => {
          assert.equal(a.rol, "admin");
          assert.isUndefined(a.password);
        });
      });

      it("getAdminPorId: obtiene el admin correcto por id", async () => {
        const creado = await proxy.addAdmin({
          dni: "903",
          nombres: "Marta",
          apellidos: "Sys",
          direccion: "Dir Z",
          telefono: "999",
          email: "marta.admin@mail.com",
          password: "zzz",
        });

        const got = await proxy.getAdminPorId(creado.id);

        assert.ok(got);
        assert.equal(got.id, creado.id);
        assert.equal(got.email, "marta.admin@mail.com");
        assert.equal(got.nombres, "Marta");
        assert.isUndefined(got.password);
      });

      it("getAdminPorEmail: busca por email normalizado", async () => {
        const creado = await proxy.addAdmin({
          dni: "904",
          nombres: "Nico",
          apellidos: "Root",
          direccion: "Dir K",
          telefono: "777",
          email: "  NICO.ADMIN@MAIL.COM ",
          password: "kkk",
        });

        const got = await proxy.getAdminPorEmail("nico.admin@mail.com");

        assert.ok(got);
        assert.equal(got.id, creado.id);
        assert.equal(got.email, "nico.admin@mail.com");
        assert.equal(got.rol, "admin");
      });

      it("getAdminPorDni: busca por DNI exacto", async () => {
        const creado = await proxy.addAdmin({
          dni: "905",
          nombres: "Mario",
          apellidos: "Root",
          direccion: "Dir M",
          telefono: "333",
          email: "mario.admin@mail.com",
          password: "mmm",
        });

        const got = await proxy.getAdminPorDni("905");

        assert.ok(got);
        assert.equal(got.id, creado.id);
        assert.equal(got.dni, "905");
        assert.equal(got.nombres, "Mario");
      });

      it("updateAdmin: aplica patch, persiste cambios y NO devuelve password", async () => {
        const creado = await proxy.addAdmin({
          dni: "906",
          nombres: "Carlos",
          apellidos: "Antiguo",
          direccion: "Dir vieja",
          telefono: "555",
          email: "carlos.admin@mail.com",
          password: "secret",
        });

        const actualizado = await proxy.updateAdmin(creado.id, {
          apellidos: "Actualizado",
          direccion: "Dir nueva",
        });

        assert.equal(actualizado.apellidos, "Actualizado");
        assert.equal(actualizado.direccion, "Dir nueva");
        assert.equal(actualizado.id, creado.id);
        assert.isUndefined(actualizado.password);

        const reread = await proxy.getAdminPorId(creado.id);
        assert.equal(reread.apellidos, "Actualizado");
        assert.equal(reread.direccion, "Dir nueva");
      });

      it("removeAdmin: elimina solo el admin indicado", async () => {
        const a1 = await proxy.addAdmin({
          dni: "907",
          nombres: "Primero",
          apellidos: "Uno",
          direccion: "Dir 1",
          telefono: "111",
          email: "primero.admin@mail.com",
          password: "p1",
        });

        const a2 = await proxy.addAdmin({
          dni: "908",
          nombres: "Segundo",
          apellidos: "Dos",
          direccion: "Dir 2",
          telefono: "222",
          email: "segundo.admin@mail.com",
          password: "p2",
        });

        let admins = await proxy.getAdmins();
        assert.equal(admins.length, 2);

        const resp = await proxy.removeAdmin(a1.id);
        if (resp && typeof resp === "object") {
          assert.property(resp, "ok");
        }

        admins = await proxy.getAdmins();
        assert.equal(admins.length, 1);
        assert.equal(admins[0].id, a2.id);
      });

      it("removeAdmins: elimina todos los admins existentes", async () => {
        await proxy.addAdmin({
          dni: "909",
          nombres: "A",
          apellidos: "Uno",
          direccion: "Dir A",
          telefono: "111",
          email: "a.admin@mail.com",
          password: "a",
        });

        await proxy.addAdmin({
          dni: "910",
          nombres: "B",
          apellidos: "Dos",
          direccion: "Dir B",
          telefono: "222",
          email: "b.admin@mail.com",
          password: "b",
        });

        let admins = await proxy.getAdmins();
        assert.equal(admins.length, 2);

        const resp = await proxy.removeAdmins();
        if (resp && typeof resp === "object") {
          assert.property(resp, "ok");
        }

        admins = await proxy.getAdmins();
        assert.equal(admins.length, 0);
      });

      it("autenticarAdmin: retorna admin seguro con credenciales válidas", async () => {
        const creado = await proxy.addAdmin({
          dni: "911",
          nombres: "Login",
          apellidos: "Admin",
          direccion: "Dir login",
          telefono: "999",
          email: "login.admin@mail.com",
          password: "clave123",
        });

        const auth = await proxy.autenticarAdmin({
          email: "login.admin@mail.com",
          password: "clave123",
        });

        assert.ok(auth);
        assert.equal(auth.id, creado.id);
        assert.equal(auth.email, "login.admin@mail.com");
        assert.equal(auth.rol, "admin");
        assert.isUndefined(auth.password);
      });
    });
  });

  // ============================================================
  // CARRITO
  // ============================================================
  describe("Proxy HTTP — Carrito (CRUD)", () => {
    let clienteId;
    let libro1;
    let libro2;

    beforeEach(async () => {
      await proxy.removeClientes();
      await proxy.removeLibros();

      libro1 = await proxy.addLibro({
        isbn: "1",
        titulo: "A",
        autores: "X",
        stock: 3,
        precio: 1000,
        resumen: "Resumen A",
      });

      libro2 = await proxy.addLibro({
        isbn: "2",
        titulo: "B",
        autores: "Y",
        stock: 5,
        precio: 2500,
        resumen: "Resumen B",
      });

      const cliente = await proxy.addCliente({
        dni: "200",
        nombres: "Carrito",
        apellidos: "Tester",
        direccion: "Dir Carro",
        telefono: "999",
        email: "carro@test.com",
        password: "clave",
      });

      clienteId = cliente.id;
    });

    it("getCarroCliente: inicialmente vacío con totales en 0", async () => {
      const cart = await proxy.getCarroCliente(clienteId);

      assert.isArray(cart.items);
      assert.equal(cart.items.length, 0);
      assert.equal(cart.subtotal, 0);
      assert.equal(cart.iva, 0);
      assert.equal(cart.total, 0);
    });

    it("getCarroCliente: retorna items con subtotal por item y totales", async () => {
      // 2 * 1000 = 2000
      await proxy.addClienteCarroItem(clienteId, libro1._id, 2);
      // 1 * 2500 = 2500
      await proxy.addClienteCarroItem(clienteId, libro2._id, 1);

      const cart = await proxy.getCarroCliente(clienteId);

      assert.isArray(cart.items);
      assert.equal(cart.items.length, 2);

      const i1 = cart.items.find((i) => i.libroId === libro1._id);
      const i2 = cart.items.find((i) => i.libroId === libro2._id);
      assert.ok(i1);
      assert.ok(i2);

      assert.equal(i1.cantidad, 2);
      assert.equal(i1.subtotal, 2 * 1000);

      assert.equal(i2.cantidad, 1);
      assert.equal(i2.subtotal, 1 * 2500);

      const expectedSubtotal = 2000 + 2500; // 4500
      const expectedIvaRate = cart.ivaRate;
      const expectedIva = expectedSubtotal * expectedIvaRate;
      const expectedTotal = expectedSubtotal + expectedIva;

      assert.equal(cart.subtotal, expectedSubtotal);
      assert.closeTo(cart.iva, expectedIva, 1e-9);
      assert.closeTo(cart.total, expectedTotal, 1e-9);
    });

    it("addClienteCarroItem: crea item si no existe y acumula hasta el tope de stock", async () => {
      await proxy.addClienteCarroItem(clienteId, libro1._id, 1);
      let cart = await proxy.addClienteCarroItem(clienteId, libro1._id, 5);

      let it = cart.items.find((i) => i.libroId === libro1._id);
      assert.ok(it);
      assert.equal(it.cantidad, 3, "no debe superar el stock");

      cart = await proxy.addClienteCarroItem(clienteId, libro2._id, 1);
      const it2 = cart.items.find((i) => i.libroId === libro2._id);
      assert.ok(it2);
      assert.equal(it2.cantidad, 1);
    });

    it("setClienteCarroItemCantidad: fija cantidad en [0, stock]; si 0 elimina el item", async () => {
      await proxy.addClienteCarroItem(clienteId, libro2._id, 1);

      let cart = await proxy.setClienteCarroItemCantidad(
        clienteId,
        libro2._id,
        99
      );
      let it = cart.items.find((i) => i.libroId === libro2._id);
      assert.ok(it);
      assert.equal(it.cantidad, 5, "no debe superar el stock");

      cart = await proxy.setClienteCarroItemCantidad(clienteId, libro2._id, 0);
      it = cart.items.find((i) => i.libroId === libro2._id);
      assert.isUndefined(it, "el item debe eliminarse cuando cantidad=0");
    });

    it("removeClienteCarroItem: elimina el item y actualiza totales", async () => {
      await proxy.addClienteCarroItem(clienteId, libro1._id, 2);
      await proxy.addClienteCarroItem(clienteId, libro2._id, 1);

      const before = await proxy.getCarroCliente(clienteId);
      assert.equal(before.items.length, 2);

      const cart = await proxy.removeClienteCarroItem(clienteId, libro1._id);

      const it1 = cart.items.find((i) => i.libroId === libro1._id);
      assert.isUndefined(it1, "el item de libro1 no debe existir");

      const expectedSubtotal = 2500;
      const expectedIvaRate = cart.ivaRate;
      const expectedIva = expectedSubtotal * expectedIvaRate;
      const expectedTotal = expectedSubtotal + expectedIva;

      assert.equal(cart.subtotal, expectedSubtotal);
      assert.closeTo(cart.iva, expectedIva, 1e-9);
      assert.closeTo(cart.total, expectedTotal, 1e-9);

      assert.equal(before.items.length, 2);
      assert.equal(cart.items.length, 1);
    });

    it("clearCarroCliente: vacía el carrito del cliente", async () => {
      await proxy.addClienteCarroItem(clienteId, libro1._id, 1);
      await proxy.addClienteCarroItem(clienteId, libro2._id, 1);

      const resp = await proxy.clearCarroCliente(clienteId);
      if (resp && typeof resp === "object") {
        assert.property(resp, "ok");
      }

      const cart = await proxy.getCarroCliente(clienteId);
      assert.equal(cart.items.length, 0);
      assert.equal(cart.subtotal, 0);
      assert.equal(cart.iva, 0);
      assert.equal(cart.total, 0);
    });
  });

  // ============================================================
  // FACTURAS
  // ============================================================
  describe("Proxy HTTP — Facturas (CRUD)", () => {
    let cliente;
    let clienteId;
    let libro1;
    let libro2;

    beforeEach(async () => {
      await proxy.removeFacturas();
      await proxy.removeClientes();
      await proxy.removeLibros();

      libro1 = await proxy.addLibro({
        isbn: "F1",
        titulo: "Libro F1",
        autores: "Autor F1",
        stock: 10,
        precio: 1000,
        resumen: "Resumen F1",
      });

      libro2 = await proxy.addLibro({
        isbn: "F2",
        titulo: "Libro F2",
        autores: "Autor F2",
        stock: 5,
        precio: 2000,
        resumen: "Resumen F2",
      });

      cliente = await proxy.addCliente({
        dni: "300",
        nombres: "Factura",
        apellidos: "Tester",
        direccion: "Dir Facturas",
        telefono: "888",
        email: "facturas@test.com",
        password: "clave",
      });
      clienteId = cliente.id;
    });

    it("facturarCompraCliente: genera factura desde carrito y limpia carrito", async () => {
      await proxy.addClienteCarroItem(clienteId, libro1._id, 2);
      await proxy.addClienteCarroItem(clienteId, libro2._id, 1);

      const beforeCart = await proxy.getCarroCliente(clienteId);
      assert.equal(beforeCart.items.length, 2);

      const meta = {
        razonSocial: "Mi Pyme",
        direccion: "Calle 1",
        dni: "55",
        email: "c@c",
      };

      const factura = await proxy.facturarCompraCliente({
        userId: clienteId,
        meta,
      });

      assert.ok(factura.id, "factura debe tener id");
      assert.ok(factura.fechaISO, "factura debe tener fechaISO");
      assert.equal(factura.meta.razonSocial, meta.razonSocial);
      assert.equal(factura.meta.dni, meta.dni);

      assert.equal(factura.subtotal, beforeCart.subtotal);
      assert.closeTo(factura.iva, beforeCart.iva, 1e-9);
      assert.closeTo(factura.total, beforeCart.total, 1e-9);
      assert.equal(factura.ivaRate, beforeCart.ivaRate);

      assert.equal(factura.items.length, beforeCart.items.length);
      assert.equal(factura.items[0].subtotal, beforeCart.items[0].subtotal);

      const afterCart = await proxy.getCarroCliente(clienteId);
      assert.equal(afterCart.items.length, 0);
      assert.equal(afterCart.subtotal, 0);
      assert.equal(afterCart.iva, 0);
      assert.equal(afterCart.total, 0);
    });


    it("getFacturas: retorna todas las facturas de todos los clientes", async () => {
      await proxy.addClienteCarroItem(clienteId, libro1._id, 1);
      const f1 = await proxy.facturarCompraCliente({
        userId: clienteId,
        meta: {
          razonSocial: "C1",
          direccion: "Dir C1",
          dni: "1010",
          email: "c1@mail.com",
        },
      });

      const cliente2 = await proxy.addCliente({
        dni: "301",
        nombres: "Otro",
        apellidos: "Cliente",
        direccion: "Dir Otro",
        telefono: "777",
        email: "otro@test.com",
        password: "clave2",
      });

      await proxy.addClienteCarroItem(cliente2.id, libro2._id, 1);
      const f2 = await proxy.facturarCompraCliente({
        userId: cliente2.id,
        meta: {
          razonSocial: "C2",
          direccion: "Dir C2",
          dni: "2020",
          email: "c2@mail.com",
        },
      });

      const todas = await proxy.getFacturas();
      const ids = todas.map((f) => f.id);

      assert.isAtLeast(todas.length, 2);
      assert.include(ids, f1.id);
      assert.include(ids, f2.id);
    });

    it("getFacturaPorId: recupera la factura correcta por id", async () => {
      await proxy.addClienteCarroItem(clienteId, libro1._id, 2);
      const factura = await proxy.facturarCompraCliente({
        userId: clienteId,
        meta: {
          razonSocial: "RZ",
          direccion: "Dir Z",
          dni: "99",
          email: "rz@mail.com",
        },
      });

      const got = await proxy.getFacturaPorId(factura.id);

      assert.ok(got);
      assert.equal(got.id, factura.id);
      assert.equal(got.total, factura.total);
      assert.equal(got.meta.razonSocial, "RZ");
    });

    it("getFacturaPorNumero: recupera la factura correcta cuando numero = id", async () => {
      await proxy.addClienteCarroItem(clienteId, libro2._id, 1);
      const factura = await proxy.facturarCompraCliente({
        userId: clienteId,
        meta: {
          razonSocial: "NUM",
          direccion: "Dir Num",
          dni: "55",
          email: "num@mail.com",
        },
      });

      const got = await proxy.getFacturaPorNumero(factura.id);

      assert.ok(got);
      assert.equal(got.id, factura.id);
      assert.equal(got.total, factura.total);
      assert.equal(got.meta.razonSocial, "NUM");
    });

    it("removeFacturas: elimina todas las facturas existentes", async () => {
      await proxy.addClienteCarroItem(clienteId, libro1._id, 1);
      await proxy.facturarCompraCliente({
        userId: clienteId,
        meta: {
          razonSocial: "RF1",
          direccion: "Dir RF1",
          dni: "1",
          email: "rf1@mail.com",
        },
      });

      await proxy.addClienteCarroItem(clienteId, libro2._id, 1);
      await proxy.facturarCompraCliente({
        userId: clienteId,
        meta: {
          razonSocial: "RF2",
          direccion: "Dir RF2",
          dni: "2",
          email: "rf2@mail.com",
        },
      });

      let todas = await proxy.getFacturas();
      assert.isAtLeast(todas.length, 2);

      const resp = await proxy.removeFacturas();
      if (resp && typeof resp === "object") {
        assert.property(resp, "ok");
      }

      todas = await proxy.getFacturas();
      assert.equal(todas.length, 0);
    });
  });
});
