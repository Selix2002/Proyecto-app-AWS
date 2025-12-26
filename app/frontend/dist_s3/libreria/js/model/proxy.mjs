// /public/libreria/js/model/proxy.mjs

import { LibreriaSession } from "../commons/libreria-session.mjs";

// Helper para centralizar manejo de errores del backend
async function handleResponse(response) {
    if (response.ok) {
        // Por si hay respuestas 204 sin body
        if (response.status === 204) return null;
        return await response.json();
    }

    // 👉 Si el backend responde 401, limpiamos la sesión
    if (response.status === 401) {
        try {
            LibreriaSession.clear?.();
            LibreriaSession.pushMessage?.(
                "Tu sesión ha expirado. Vuelve a iniciar sesión.",
                "error"
            );
        } catch {
            // ignoramos errores de sesión/mensajes
        }
    }

    let message = `Error ${response.status}: ${response.statusText}`;
    try {
        const body = await response.json();
        message = body.message || body.error || message;
    } catch {
        // ignore JSON parse error, dejamos el message previo
    }

    throw new Error(message);
}


// Helper para headers con JSON + Authorization
function authHeaders(extra = {}) {
    const token = LibreriaSession.getToken?.();
    const headers = {
        "Content-Type": "application/json;charset=utf-8",
        ...extra,
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}


export const ROL = {
    ADMIN: "ADMIN",
    CLIENTE: "CLIENTE",
};

const BASE_URL = 'https://dedwm83rc4.execute-api.us-east-1.amazonaws.com/api';

export class LibreriaProxy {

    constructor() { }

    // ===================== USUARIOS / AUTH JWT =====================

    // Signup genérico: crea usuario (cliente por defecto, o rol según body)
    async signupUsuario(obj) {
        const response = await fetch(`${BASE_URL}/usuarios`, {
            method: "POST",
            body: JSON.stringify(obj),
            headers: { "Content-Type": "application/json;charset=utf-8" },
        });
        return handleResponse(response);
    }

    // Signin: devuelve { token }
    async autenticar({ email, password, rol }) {
        const response = await fetch(`${BASE_URL}/autenticar`, {
            method: "POST",
            body: JSON.stringify({ email, password, rol }),
            headers: { "Content-Type": "application/json;charset=utf-8" },
        });
        return handleResponse(response); // { token }
    }

    // Usuario actual (a partir del token)
    async getUsuarioActual() {
        const response = await fetch(`${BASE_URL}/usuarios/actual`, {
            method: "GET",
            headers: authHeaders(),
        });
        return handleResponse(response);
    }

    // Usuario por id (ruta privada)
    async getUsuarioPorId(id) {
        const response = await fetch(`${BASE_URL}/usuarios/${id}`, {
            method: "GET",
            headers: authHeaders(),
        });
        return handleResponse(response);
    }

    // Actualizar usuario (perfil). En el backend se usa el id del token igualmente.
    async updateUsuario(id, patch) {
        const response = await fetch(`${BASE_URL}/usuarios/${id}`, {
            method: "PUT",
            body: JSON.stringify(patch),
            headers: authHeaders(),
        });
        return handleResponse(response);
    }


    // ===================== LIBROS =====================

    async getLibros() {
        let response = await fetch(`${BASE_URL}/libros`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async addLibro(obj) {
        let response = await fetch(`${BASE_URL}/libros`, {
            method: 'POST',
            body: JSON.stringify(obj),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async setLibros(array) {
        let response = await fetch(`${BASE_URL}/libros`, {
            method: 'PUT',
            body: JSON.stringify(array),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getLibroPorId(id) {
        console.log("Proxy: obteniendo libro por id:", id);
        let response = await fetch(`${BASE_URL}/libros/${id}`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getLibroPorIsbn(isbn) {
        const url = new URL(`${BASE_URL}/libros`);
        url.searchParams.set('isbn', isbn);
        let response = await fetch(url.toString());
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getLibroPorTitulo(titulo) {
        const url = new URL(`${BASE_URL}/libros`);
        url.searchParams.set('titulo', titulo);
        let response = await fetch(url.toString());
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async removeLibro(id) {
        let response = await fetch(`${BASE_URL}/libros/${id}`, { method: 'DELETE' });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async removeLibros() {
        let response = await fetch(`${BASE_URL}/libros`, { method: 'DELETE' });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async updateLibro(id, patch) {
        console.log("Actualizar libro en proxy:", id, patch);

        const response = await fetch(`${BASE_URL}/libros/${id}`, {
            method: 'PUT',
            body: JSON.stringify(patch),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });

        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }


    // ===================== CLIENTES =====================

    async getClientes() {
        let response = await fetch(`${BASE_URL}/clientes`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getClientePorId(id) {
        let response = await fetch(`${BASE_URL}/clientes/${id}`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getClientePorEmail(email) {
        const url = new URL(`${BASE_URL}/clientes`);
        url.searchParams.set('email', email);
        let response = await fetch(url.toString());
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getClientePorDni(dni) {
        const url = new URL(`${BASE_URL}/clientes`);
        url.searchParams.set('dni', dni);
        let response = await fetch(url.toString());
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async addCliente(obj) {
        console.log("Agregar cliente en proxy:", obj);
        let response = await fetch(`${BASE_URL}/clientes`, {
            method: 'POST',
            body: JSON.stringify(obj),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async setClientes(array) {
        let response = await fetch(`${BASE_URL}/clientes`, {
            method: 'PUT',
            body: JSON.stringify(array),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async removeClientes() {
        let response = await fetch(`${BASE_URL}/clientes`, {
            method: 'DELETE'
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async updateCliente(id, patch) {
        let response = await fetch(`${BASE_URL}/clientes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(patch),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async removeCliente(id) {
        let response = await fetch(`${BASE_URL}/clientes/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async autenticarCliente({ email, password }) {
        let response = await fetch(`${BASE_URL}/clientes/autenticar`, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    // ===================== CARRITO DE COMPRA =====================

    async getCarroCliente(idCliente) {
        let response = await fetch(`${BASE_URL}/clientes/${idCliente}/carro`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async addClienteCarroItem(idCliente, libroId, cantidad = 1) {
        let response = await fetch(`${BASE_URL}/clientes/${idCliente}/carro/items`, {
            method: 'POST',
            body: JSON.stringify({ libroId, cantidad }),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async setClienteCarroItemCantidad(idCliente, indexOrLibroId, cantidad) {
        let response = await fetch(
            `${BASE_URL}/clientes/${idCliente}/carro/items/${indexOrLibroId}`,
            {
                method: 'PUT',
                body: JSON.stringify({ cantidad }),
                headers: { 'Content-Type': 'application/json;charset=utf-8' }
            }
        );
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async removeClienteCarroItem(idCliente, indexOrLibroId) {
        let response = await fetch(
            `${BASE_URL}/clientes/${idCliente}/carro/items/${indexOrLibroId}`,
            { method: 'DELETE' }
        );
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async clearCarroCliente(idCliente) {
        let response = await fetch(`${BASE_URL}/clientes/${idCliente}/carro`, {
            method: 'DELETE'
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    // ===================== ADMINS =====================

    async getAdmins() {
        let response = await fetch(`${BASE_URL}/admins`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getAdminPorId(id) {
        let response = await fetch(`${BASE_URL}/admins/${id}`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getAdminPorEmail(email) {
        const url = new URL(`${BASE_URL}/admins`);
        url.searchParams.set('email', email);
        let response = await fetch(url.toString());
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getAdminPorDni(dni) {
        const url = new URL(`${BASE_URL}/admins`);
        url.searchParams.set('dni', dni);
        let response = await fetch(url.toString());
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async addAdmin(obj) {
        let response = await fetch(`${BASE_URL}/admins`, {
            method: 'POST',
            body: JSON.stringify(obj),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async updateAdmin(id, patch) {
        let response = await fetch(`${BASE_URL}/admins/${id}`, {
            method: 'PUT',
            body: JSON.stringify(patch),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async removeAdmin(id) {
        let response = await fetch(`${BASE_URL}/admins/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async removeAdmins() {
        let response = await fetch(`${BASE_URL}/admins`, {
            method: 'DELETE'
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async autenticarAdmin({ email, password }) {
        let response = await fetch(`${BASE_URL}/admins/autenticar`, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    // ===================== FACTURAS =====================

    async getFacturas() {
        let response = await fetch(`${BASE_URL}/facturas`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getFacturasPorCliente(idCliente) {
        const url = new URL(`${BASE_URL}/facturas`, window.location.origin);
        url.searchParams.set("cliente", idCliente);
        const response = await fetch(url);

        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getFacturaPorId(id) {
        let response = await fetch(`${BASE_URL}/facturas/${id}`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async getFacturaPorNumero(numero) {
        const url = new URL(`${BASE_URL}/facturas`);
        url.searchParams.set('numero', numero);
        let response = await fetch(url.toString());
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async removeFacturas() {
        let response = await fetch(`${BASE_URL}/facturas`, {
            method: 'DELETE'
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

    async facturarCompraCliente(obj) {
        let response = await fetch(`${BASE_URL}/facturas`, {
            method: 'POST',
            body: JSON.stringify(obj),
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }

}

export const proxy = new LibreriaProxy();
