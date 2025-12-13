// AJUSTA ESTA RUTA SI ES NECESARIO:
import { proxy } from "../../libreria/js/model/proxy.mjs";
import * as chai from "../chai.js";

const { assert } = chai;

describe("Cálculos — Proxy HTTP", () => {
    let clienteId;
    let libro1;
    let libro2;

    beforeEach(async () => {
        // Dejamos todo limpio antes de cada test
        await proxy.removeFacturas();
        await proxy.removeClientes();
        await proxy.removeLibros();

        // stock y precios conocidos
        libro1 = await proxy.addLibro({
            isbn: "1",
            titulo: "A",
            autores: "X",
            stock: 3,
            precio: 1000,
            resumen: "R A",
        });

        libro2 = await proxy.addLibro({
            isbn: "2",
            titulo: "B",
            autores: "Y",
            stock: 5,
            precio: 2500,
            resumen: "R B",
        });

        const cliente = await proxy.addCliente({
            dni: "CART",
            nombres: "Carrito",
            apellidos: "Tester",
            direccion: "Dir Carro",
            telefono: "999",
            email: "carrito@test.com",
            password: "clave",
        });

        clienteId = cliente.id;
    });

    it("getCarroCliente calcula subtotal, iva y total", async () => {
        // 2 * 1000 = 2000
        await proxy.addClienteCarroItem(clienteId, libro1._id, 2);
        // 1 * 2500 = 2500
        await proxy.addClienteCarroItem(clienteId, libro2._id, 1);

        const cart = await proxy.getCarroCliente(clienteId);

        const expectedSubtotal = 2 * libro1.precio + 1 * libro2.precio; // 4500
        const expectedIvaRate = cart.ivaRate; // no asumimos 4% fijo
        const expectedIva = expectedSubtotal * expectedIvaRate;
        const expectedTotal = expectedSubtotal + expectedIva;

        assert.equal(cart.subtotal, expectedSubtotal);
        assert.closeTo(cart.iva, expectedIva, 1e-9);
        assert.closeTo(cart.total, expectedTotal, 1e-9);
    });

    it("setClienteCarroItemCantidad respeta [0, stock] y quita item en 0", async () => {
        // stock libro1 = 3
        await proxy.addClienteCarroItem(clienteId, libro1._id, 1);

        // subir por encima del stock → queda en 3
        let cart = await proxy.setClienteCarroItemCantidad(
            clienteId,
            libro1._id,
            99
        );
        let it = cart.items.find((i) => i.libroId === libro1._id);
        assert.ok(it);
        assert.equal(it.cantidad, libro1.stock, "no debe superar el stock");

        // poner cantidad 0 → remueve el item
        cart = await proxy.setClienteCarroItemCantidad(clienteId, libro1._id, 0);
        it = cart.items.find((i) => i.libroId === libro1._id);
        assert.isUndefined(
            it,
            "el item debe eliminarse cuando cantidad se fija en 0"
        );
    });

    it("facturarCompraCliente copia totales/ítems y limpia el carrito", async () => {
        await proxy.addClienteCarroItem(clienteId, libro1._id, 2); // 2000
        await proxy.addClienteCarroItem(clienteId, libro2._id, 1); // 2500

        const before = await proxy.getCarroCliente(clienteId);

        const meta = {
            razonSocial: "Mi Pyme",
            direccion: "Calle 1",
            dni: "55",
            email: "c@c",
        };

        const fac = await proxy.facturarCompraCliente({
            userId: clienteId,
            meta,
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
        const after = await proxy.getCarroCliente(clienteId);
        assert.equal(after.items.length, 0);
        assert.equal(after.subtotal, 0);
        assert.equal(after.iva, 0);
        assert.equal(after.total, 0);
    });

    it("valor de inventario = sum(stock * precio)", async () => {
        // Tenemos solo L1 y L2 por el beforeEach
        // L1: 3*1000 = 3000; L2: 5*2500 = 12500  → total 15500
        const libros = await proxy.getLibros();
        const valor = libros.reduce((acc, l) => acc + l.stock * l.precio, 0);
        assert.equal(valor, 15500);
    });

    it("total facturado (sum de facturas creadas)", async () => {
        // compra 1
        await proxy.addClienteCarroItem(clienteId, libro1._id, 1); // 1000
        const before1 = await proxy.getCarroCliente(clienteId);
        const fac1 = await proxy.facturarCompraCliente({
            userId: clienteId,
            meta: {
                razonSocial: "R1",
                direccion: "D1",
                dni: "11",
                email: "r1@mail.com",
            },
        });

        // compra 2
        await proxy.addClienteCarroItem(clienteId, libro2._id, 2); // 5000
        const before2 = await proxy.getCarroCliente(clienteId);
        const fac2 = await proxy.facturarCompraCliente({
            userId: clienteId,
            meta: {
                razonSocial: "R2",
                direccion: "D2",
                dni: "22",
                email: "r2@mail.com",
            },
        });

        // usamos la misma tasa de IVA que maneja el backend
        const ivaRate = before1.ivaRate; // o fac1.ivaRate, deben coincidir
        const expectedTotal =
            before1.subtotal * (1 + ivaRate) + before2.subtotal * (1 + ivaRate);

        const facturas = await proxy.getFacturas();
        const total = facturas.reduce((acc, f) => acc + f.total, 0);

        assert.closeTo(total, expectedTotal, 1e-9);
    });
});
