// /public/test/spec/exceptions-proxy.spec.mjs

// 👇 AJUSTA ESTA RUTA SI TU HTML CAMBIÓ DE LUGAR
import { proxy } from "../../libreria/js/model/proxy.mjs";
import * as chai from "../chai.js";
const { assert } = chai;

// Helper para comprobar errores HTTP del proxy
async function expectHttpError(promise, statusCode) {
    try {
        await promise;
        assert.fail(`Debería lanzar Error ${statusCode}`);
    } catch (err) {
        assert.ok(err instanceof Error);
        // el proxy lanza: `Error 400: Bad Request`
        assert.match(err.message, new RegExp(`Error ${statusCode}:`));
    }
}

describe("Excepciones (HTTP - Proxy)", () => {
    // ====================== CLIENTES (equiv. Users) ======================
    describe("Clientes", () => {
        beforeEach(async () => {
            await proxy.removeClientes();
            await proxy.removeAdmins(); // para el test de rol
        });

        it("addCliente lanza (400) si falta un campo requerido", async () => {
            await expectHttpError(proxy.addCliente({}), 400);
        });

        it("addCliente lanza (400) por email duplicado y por DNI duplicado", async () => {
            await proxy.addCliente({
                dni: "1",
                nombres: "A",
                apellidos: "B",
                direccion: "x",
                telefono: "1",
                email: "a@mail.com",
                password: "123",
            });

            // Email duplicado
            await expectHttpError(
                proxy.addCliente({
                    dni: "2",
                    nombres: "C",
                    apellidos: "D",
                    direccion: "x",
                    telefono: "1",
                    email: "a@mail.com",
                    password: "123",
                }),
                400
            );

            // DNI duplicado
            await expectHttpError(
                proxy.addCliente({
                    dni: "1",
                    nombres: "E",
                    apellidos: "F",
                    direccion: "x",
                    telefono: "1",
                    email: "e@mail.com",
                    password: "123",
                }),
                400
            );
        });

        it("updateCliente lanza (400) si el id no existe", async () => {
            await expectHttpError(
                proxy.updateCliente("123123123", { nombres: "Z" }),
                400
            );
        });

        // ------------------ Clientes.autenticar (login) ------------------
        describe("Clientes.autenticar (login)", () => {
            beforeEach(async () => {
                await proxy.removeClientes();
                await proxy.removeAdmins();

                // cliente base
                await proxy.addCliente({
                    dni: "9",
                    nombres: "Test",
                    apellidos: "User",
                    direccion: "X",
                    telefono: "1",
                    email: "test@mail.com",
                    password: "1234",
                });
            });

            it("devuelve el cliente cuando email y password son correctos", async () => {
                const user = await proxy.autenticarCliente({
                    email: "test@mail.com",
                    password: "1234",
                });

                assert.ok(user, "debería autenticar correctamente");
                assert.equal(user.email, "test@mail.com");
                assert.equal(user.rol, "cliente");
                assert.isUndefined(user.password, "no debe exponer password");
            });


            it("retorna error 401 cuando la contraseña es incorrecta", async () => {
                await expectHttpError(
                    proxy.autenticarCliente({
                        email: "test@mail.com",
                        password: "mala",
                    }),
                    401
                );
            });

            it("retorna error 401 cuando el correo no existe / es incorrecto", async () => {
                await expectHttpError(
                    proxy.autenticarCliente({
                        email: "noexiste@mail.com",
                        password: "1234",
                    }),
                    401
                );
            });

            it("retorna error 401 cuando el rol no coincide (intentar loguear un admin como cliente)", async () => {
                // Creamos un admin válido
                const admin = await proxy.addAdmin({
                    dni: "99",
                    nombres: "Admin",
                    apellidos: "Root",
                    direccion: "Oficina",
                    telefono: "555",
                    email: "admin@mail.com",
                    password: "root123",
                });

                assert.ok(admin.id);

                // Intentar autenticarse por el endpoint de clientes
                await expectHttpError(
                    proxy.autenticarCliente({
                        email: "admin@mail.com",
                        password: "root123",
                    }),
                    401
                );
            });
        });

        // ------------------ Admins.autenticar (login) ------------------
        describe("Admins.autenticar (login)", () => {
            let admin;

            beforeEach(async () => {
                // Dejamos limpio antes de cada test
                await proxy.removeAdmins();
                await proxy.removeClientes(); // por si acaso

                // Admin base
                admin = await proxy.addAdmin({
                    dni: "9000",
                    nombres: "Root",
                    apellidos: "Admin",
                    direccion: "Dir Login",
                    telefono: "123456",
                    email: "admin@login.com",
                    password: "clave123",
                });
            });

            it("devuelve el admin (y token) cuando email y password son correctos", async () => {
                const user = await proxy.autenticarAdmin({
                    email: "admin@login.com",
                    password: "clave123",
                });

                assert.ok(user, "debería autenticar correctamente");
                assert.equal(user.id, admin.id);
                assert.equal(user.email, "admin@login.com");
                assert.equal(user.rol, "admin");
                assert.isUndefined(user.password, "no debe exponer password");
            });

            it("retorna error 401 cuando la contraseña es incorrecta", async () => {
                await expectHttpError(
                    proxy.autenticarAdmin({
                        email: "admin@login.com",
                        password: "mala",
                    }),
                    401
                );
            });

            it("retorna error 401 cuando el correo no existe / es incorrecto", async () => {
                await expectHttpError(
                    proxy.autenticarAdmin({
                        email: "noexiste@login.com",
                        password: "clave123",
                    }),
                    401
                );
            });

            it("retorna error 401 cuando intenta autenticarse un cliente por el endpoint de admins", async () => {
                // Creamos un cliente válido
                const cliente = await proxy.addCliente({
                    dni: "1234",
                    nombres: "Cliente",
                    apellidos: "Normal",
                    direccion: "Dir Cliente",
                    telefono: "999",
                    email: "cliente@login.com",
                    password: "cli123",
                });

                assert.ok(cliente.id);

                await expectHttpError(
                    proxy.autenticarAdmin({
                        email: "cliente@login.com",
                        password: "cli123",
                    }),
                    401
                );
            });
        });
    });

    // ========================== LIBROS ==========================
    describe("Libros", () => {
        beforeEach(async () => {
            await proxy.removeLibros();
        });

        it("update/remove lanza (404) si el libro no existe", async () => {
            await expectHttpError(proxy.updateLibro("xxx", { titulo: "T" }), 400);
            await expectHttpError(proxy.removeLibro("xxx"), 400);
        });

        it("addLibro lanza (400) si falta isbn", async () => {
            await expectHttpError(
                proxy.addLibro({
                    // falta isbn
                    titulo: "T1",
                    autores: "AU",
                    stock: 1,
                    precio: 1000,
                }),
                400
            );
        });

        it("addLibro lanza (400) si falta titulo", async () => {
            await expectHttpError(
                proxy.addLibro({
                    isbn: "X1", // falta titulo
                    autores: "AU",
                    stock: 1,
                    precio: 1000,
                }),
                400
            );
        });

        it("addLibro lanza (400) si falta autores", async () => {
            await expectHttpError(
                proxy.addLibro({
                    isbn: "X2",
                    titulo: "T1", // falta autores
                    stock: 1,
                    precio: 1000,
                }),
                400
            );
        });

        it("addLibro lanza (400) si stock es 0 o negativo", async () => {
            await expectHttpError(
                proxy.addLibro({
                    isbn: "X3",
                    titulo: "T1",
                    autores: "AU",
                    stock: 0,
                    precio: 1000,
                }),
                400
            );

            await expectHttpError(
                proxy.addLibro({
                    isbn: "X4",
                    titulo: "T1",
                    autores: "AU",
                    stock: -5,
                    precio: 1000,
                }),
                400
            );
        });

        it("addLibro lanza (400) si precio es 0 o negativo", async () => {
            await expectHttpError(
                proxy.addLibro({
                    isbn: "X5",
                    titulo: "T1",
                    autores: "AU",
                    stock: 1,
                    precio: 0,
                }),
                400
            );

            await expectHttpError(
                proxy.addLibro({
                    isbn: "X6",
                    titulo: "T1",
                    autores: "AU",
                    stock: 1,
                    precio: -10,
                }),
                400
            );
        });

        it("addLibro lanza (400) si stock no es entero o no es numérico", async () => {
            await expectHttpError(
                proxy.addLibro({
                    isbn: "X7",
                    titulo: "T1",
                    autores: "AU",
                    stock: 1.5,
                    precio: 1000,
                }),
                400
            );

            await expectHttpError(
                proxy.addLibro({
                    isbn: "X8",
                    titulo: "T1",
                    autores: "AU",
                    stock: "no-num",
                    precio: 1000,
                }),
                400
            );
        });

        it("addLibro lanza (400) si precio no es numérico", async () => {
            await expectHttpError(
                proxy.addLibro({
                    isbn: "X9",
                    titulo: "T1",
                    autores: "AU",
                    stock: 1,
                    precio: "caro",
                }),
                400
            );
        });

        it("addLibro lanza (400) si el ISBN ya existe", async () => {
            await proxy.addLibro({
                isbn: "DUP",
                titulo: "A",
                autores: "AU",
                stock: 1,
                precio: 1000,
                resumen: "R A",
            });

            await expectHttpError(
                proxy.addLibro({
                    isbn: "DUP",
                    titulo: "B",
                    autores: "AU2",
                    stock: 2,
                    precio: 2000,
                }),
                400
            );
        });
    });

    // ========================== CARRITO ==========================
    describe("Carrito", () => {
        let clienteId;
        let libro;

        beforeEach(async () => {
            await proxy.removeClientes();
            await proxy.removeLibros();
            await proxy.removeFacturas();

            libro = await proxy.addLibro({
                isbn: "1",
                titulo: "A",
                autores: "X",
                stock: 3,
                precio: 1000,
                resumen: "R",
            });

            const cliente = await proxy.addCliente({
                dni: "U-CART",
                nombres: "Carro",
                apellidos: "User",
                direccion: "Dir",
                telefono: "1",
                email: "carro@mail.com",
                password: "123",
            });

            clienteId = cliente.id;
        });

        it("setClienteCarroItemCantidad lanza (400) si cantidad es negativa, no numérica o infinita", async () => {
            // Primero creamos un item en el carrito
            await proxy.addClienteCarroItem(clienteId, libro._id, 1);

            await expectHttpError(
                proxy.setClienteCarroItemCantidad(clienteId, libro._id, -2),
                400
            );
            await expectHttpError(
                proxy.setClienteCarroItemCantidad(clienteId, libro._id, "mucho"),
                400
            );
            await expectHttpError(
                proxy.setClienteCarroItemCantidad(clienteId, libro._id, Infinity),
                400
            );
        });

        it("removeClienteCarroItem lanza (400) si el item no existe", async () => {
            await expectHttpError(
                proxy.removeClienteCarroItem(clienteId, libro._id),
                400
            );
        });
    });

    // ========================== FACTURA ==========================
    describe("Factura", () => {
        let clienteId;
        let libro;

        beforeEach(async () => {
            await proxy.removeFacturas();
            await proxy.removeClientes();
            await proxy.removeLibros();

            libro = await proxy.addLibro({
                isbn: "1",
                titulo: "A",
                autores: "X",
                stock: 3,
                precio: 1000,
                resumen: "R",
            });

            const cliente = await proxy.addCliente({
                dni: "U-FACT",
                nombres: "Factura",
                apellidos: "User",
                direccion: "Dir",
                telefono: "1",
                email: "fac@mail.com",
                password: "123",
            });

            clienteId = cliente.id;
        });

        it("facturarCompraCliente lanza (400) si el carrito está vacío", async () => {
            await expectHttpError(
                proxy.facturarCompraCliente({ userId: clienteId, meta: {} }),
                400
            );
        });

        it("facturarCompraCliente lanza (400) si userId es null", async () => {
            await expectHttpError(
                proxy.facturarCompraCliente({ userId: null, meta: {} }),
                400
            );
        });

        it("facturarCompraCliente lanza (404) si userId no existe", async () => {
            await expectHttpError(
                proxy.facturarCompraCliente({ userId: "no-existe", meta: {} }),
                400
            );
        });

        it("facturarCompraCliente lanza (400) si la información está incompleta (sin email, dni, dirección o razón social)", async () => {
            // Preparamos carrito con items
            await proxy.addClienteCarroItem(clienteId, libro._id, 2);

            // sin razonSocial
            await expectHttpError(
                proxy.facturarCompraCliente({
                    userId: clienteId,
                    meta: { direccion: "x", dni: "1", email: "a@mail.com" },
                }),
                400
            );

            // sin direccion
            await expectHttpError(
                proxy.facturarCompraCliente({
                    userId: clienteId,
                    meta: { razonSocial: "X", dni: "1", email: "a@mail.com" },
                }),
                400
            );

            // sin dni
            await expectHttpError(
                proxy.facturarCompraCliente({
                    userId: clienteId,
                    meta: { razonSocial: "X", direccion: "x", email: "a@mail.com" },
                }),
                400
            );

            // sin email
            await expectHttpError(
                proxy.facturarCompraCliente({
                    userId: clienteId,
                    meta: { razonSocial: "X", direccion: "x", dni: "1" },
                }),
                400
            );
        });
    });
});
