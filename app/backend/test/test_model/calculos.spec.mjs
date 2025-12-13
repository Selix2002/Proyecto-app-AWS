import { model } from "../../model/model.mjs";
import * as chai from "chai";
import {
  connectDB,
  clearMongoTest,
  resetMongoTest,
} from "../helpers/db_test.mjs";

const { assert } = chai;

describe("Cálculos (Mongo)", () => {
  let USER_ID;
  let L1_ID;
  let L2_ID;

  // Conexión a la base de pruebas (libreria_test)
  before(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearMongoTest();

    const u = await model.users.addUser({
      dni: "777",
      nombres: "Calculos",
      apellidos: "Test",
      direccion: "X",
      telefono: "1",
      email: "calc@test.com",
      password: "1234",
    });
    USER_ID = (u.id ?? u._id)?.toString();

    // stock y precios conocidos
    const l1 = await model.libros.addLibro({
      isbn: "1",
      titulo: "A",
      autores: "X",
      stock: 3,
      precio: 1000,
      resumen: "Reseña A",
    });
    const l2 = await model.libros.addLibro({
      isbn: "2",
      titulo: "B",
      autores: "Y",
      stock: 5,
      precio: 2500,
      resumen: "Reseña B",
    });

    L1_ID = (l1.id ?? l1._id)?.toString();
    L2_ID = (l2.id ?? l2._id)?.toString();
  });

  // Cerrar conexión y dropear la base de pruebas al final
  after(async () => {
    await resetMongoTest();
  });

  it("Cart.get calcula subtotal, iva (4%) y total", async () => {
    await model.carts.add(USER_ID, L1_ID, 2); // 2 * 1000 = 2000
    await model.carts.add(USER_ID, L2_ID, 1); // 1 * 2500 = 2500

    const cart = await model.carts.get(USER_ID);

    const expectedSubtotal = 2000 + 2500; // 4500
    const expectedIva = expectedSubtotal * 0.04;
    const expectedTotal = expectedSubtotal + expectedIva;

    assert.equal(cart.subtotal, expectedSubtotal);
    assert.closeTo(cart.iva, expectedIva, 1e-9);
    assert.closeTo(cart.total, expectedTotal, 1e-9);
    assert.equal(cart.ivaRate, 0.04);
  });

  it("setQty, inc, dec respetan [0, stock] y quitan item en 0", async () => {
    // L1 tiene stock 3
    await model.carts.add(USER_ID, L1_ID, 1);

    // subir por encima del stock → queda en 3
    await model.carts.setQty(USER_ID, L1_ID, 99);
    let c = await model.carts.get(USER_ID);
    assert.equal(
      c.items.find((i) => i.libroId === L1_ID).cantidad,
      3,
    );

    // dec hasta 0 → remueve
    await model.carts.dec(USER_ID, L1_ID); // 2
    await model.carts.dec(USER_ID, L1_ID); // 1
    c = await model.carts.dec(USER_ID, L1_ID); // 0 → remove
    assert.isUndefined(c.items.find((i) => i.libroId === L1_ID));
  });

  it("Factura.createFromCart copia totales/ítems y limpia el carrito", async () => {
    await model.carts.add(USER_ID, L1_ID, 2); // 2000
    await model.carts.add(USER_ID, L2_ID, 1); // 2500

    const before = await model.carts.get(USER_ID);

    const fac = await model.facturas.createFromCart(USER_ID, {
      razonSocial: "Mi Pyme",
      direccion: "Calle 1",
      dni: "55",
      email: "c@c",
    });

    // totales
    assert.equal(fac.subtotal, before.subtotal);
    assert.closeTo(fac.iva, before.iva, 1e-9);
    assert.closeTo(fac.total, before.total, 1e-9);
    assert.equal(fac.ivaRate, before.ivaRate);

    // items
    assert.equal(fac.items.length, before.items.length);
    assert.equal(fac.items[0].subtotal, before.items[0].subtotal);

    // carrito vacío tras facturar
    const after = await model.carts.get(USER_ID);
    assert.equal(after.items.length, 0);
    assert.equal(after.subtotal, 0);
    assert.equal(after.iva, 0);
    assert.equal(after.total, 0);
  });

  it("valor de inventario = sum(stock * precio)", async () => {
    // L1: 3*1000 = 3000; L2: 5*2500 = 12500  → total 15500
    const libros = await model.libros.getLibros();
    const valor = libros.reduce((acc, l) => acc + l.stock * l.precio, 0);
    assert.equal(valor, 15500);
  });

  it("total facturado a un usuario (sum de facturas)", async () => {
    // compra 1
    await model.carts.add(USER_ID, L1_ID, 1); // 1000 + 4% = 1040
    await model.facturas.createFromCart(USER_ID, {
      razonSocial: "R1",
      direccion: "D1",
      dni: "11",
      email: "r1@mail.com",
    });

    // compra 2
    await model.carts.add(USER_ID, L2_ID, 2); // 5000 + 4% = 5200
    await model.facturas.createFromCart(USER_ID, {
      razonSocial: "R2",
      direccion: "D2",
      dni: "22",
      email: "r2@mail.com",
    });

    const facturas = await model.facturas.getAll(USER_ID);
    const total = facturas.reduce((acc, f) => acc + f.total, 0);
    assert.closeTo(total, 1040 + 5200, 1e-9);
  });
});
