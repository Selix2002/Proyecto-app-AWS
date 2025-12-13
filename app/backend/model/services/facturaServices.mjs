// src/model/services/facturaService.mjs
import { Factura } from "../schema/factura.mjs";
import { Carro } from "../schema/carro.mjs";

export class FacturaService {
    // ---------- Helpers internos ----------

    async _getCart(usuarioId) {
        if (!usuarioId) throw new Error("ID de usuario no existe");

        const cart = await Carro.findOne({ usuario: usuarioId }).exec();
        return cart;
    }

    _cartToSummary(cart) {
        // Equivalente a lo que hacía CartStore.get(userId)
        const items = cart.items.map((it) => {
            const subtotal = it.precio * it.cantidad;
            return {
                libro: it.libro,
                libroId: it.libroId,
                titulo: it.titulo,
                precio: it.precio,
                cantidad: it.cantidad,
                stock: it.stock,
                subtotal,
            };
        });

        const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
        const ivaRate = cart.ivaRate ?? 0.04;
        const iva = subtotal * ivaRate;
        const total = subtotal + iva;

        return { items, subtotal, iva, total, ivaRate };
    }

    _validateMeta(meta) {
        if (!meta) throw new Error("Faltan datos de factura");

        const required = {
            razonSocial: "razón social",
            direccion: "dirección",
            dni: "dni",
            email: "email",
        };

        for (const [key, label] of Object.entries(required)) {
            const value = String(meta[key] ?? "").trim();
            if (!value) throw new Error(`Falta ${label}`);
        }
    }

    // ---------- API pública ----------

    /**
     * createFromCart(userId, meta)
     * - Genera una factura a partir del carrito del usuario.
     * - Vacía el carrito si todo sale bien.
     */
    async createFromCart(usuarioId, meta = {}) {
        if (!usuarioId) throw new Error("ID de usuario no existe");
        this._validateMeta(meta);

        const cart = await this._getCart(usuarioId);
        if (!cart || !cart.items || cart.items.length === 0) {
            throw new Error("Carrito vacío");
        }

        const resumen = this._cartToSummary(cart);

        const facturaDoc = await Factura.create({
            usuario: usuarioId,
            fechaISO: new Date().toISOString(),
            subtotal: resumen.subtotal,
            iva: resumen.iva,
            total: resumen.total,
            ivaRate: resumen.ivaRate,
            items: resumen.items.map((it) => ({
                libro: it.libro,           // ObjectId opcional
                libroId: it.libroId,       // string (compatibilidad)
                titulo: it.titulo,
                precio: it.precio,
                cantidad: it.cantidad,
                subtotal: it.subtotal,
            })),
            meta: {
                razonSocial: meta.razonSocial.trim(),
                direccion: meta.direccion.trim(),
                dni: meta.dni.trim(),
                email: meta.email.trim().toLowerCase(),
            },
        });

        // Vaciar carrito del usuario (equivalente a this.model.carts.clear(userId))
        cart.items = [];
        await cart.save();

        return facturaDoc;
    }

    /**
     * getAll(userId)
     * - Devuelve todas las facturas de un usuario.
     * - Similar a [...this._arr(userId)] en tu modelo original.
     */
    async getAll(usuarioId) {
        if (!usuarioId) throw new Error("ID de usuario no existe");

        const facturas = await Factura.find({ usuario: usuarioId })
            .sort({ createdAt: -1 }) // opcional: más recientes primero
            .exec();

        return facturas;
    }

    /**
     * getById(userId, orderId)
     * - Busca una factura por su id para un usuario específico.
     * - Equivalente a this._arr(userId).find(o => o.id === orderId)
     */
    async getById(usuarioId, orderId) {
        if (!usuarioId || !orderId) return null;

        const factura = await Factura.findOne({
            _id: orderId,
            usuario: usuarioId,
        }).exec();

        return factura; // null si no existe, igual que .find(...)
    }
}

export const facturaService = new FacturaService();
