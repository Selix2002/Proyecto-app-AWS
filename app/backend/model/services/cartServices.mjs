// src/model/services/cartService.mjs
import { Carro } from "../schema/carro.mjs";
import { Libro } from "../schema/libro.mjs";

export class CartService {
    constructor() {
        this.IVA_LIBROS = 0.04;
    }

    async _getOrCreateCart(usuarioId) {
        if (!usuarioId) throw new Error("ID de usuario no existe");

        let cart = await Carro.findOne({ usuario: usuarioId }).exec();
        if (!cart) {
            cart = await Carro.create({
                usuario: usuarioId,
                items: [],
                ivaRate: this.IVA_LIBROS,
            });
        } else if (cart.ivaRate == null) {
            cart.ivaRate = this.IVA_LIBROS;
            await cart.save();
        }
        return cart;
    }

    _findItem(cart, libroId) {
        const idStr = String(libroId);
        return cart.items.find((it) => it.libroId === idStr);
    }

    _toResponse(cart) {
        const items = cart.items.map((it) => {
            const subtotal = it.precio * it.cantidad;
            return {
                libroId: it.libroId,
                titulo: it.titulo,
                precio: it.precio,
                cantidad: it.cantidad,
                stock: it.stock,
                subtotal,
            };
        });

        const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
        const ivaRate = cart.ivaRate ?? this.IVA_LIBROS;
        const iva = subtotal * ivaRate;
        const total = subtotal + iva;

        return { items, subtotal, iva, total, ivaRate };
    }

    // ---------- API pública ----------

    async get(usuarioId) {
        const cart = await this._getOrCreateCart(usuarioId);
        return this._toResponse(cart);
    }

    async add(usuarioId, libroId, qty = 1) {
        const libro = await Libro.findById(libroId).exec();
        if (!libro) throw new Error("Libro no encontrado");

        const max = Number(libro.stock) || 0;
        if (max <= 0) throw new Error("Sin stock");

        let n = Number(qty);
        if (!Number.isFinite(n) || n <= 0) {
            throw new Error("Cantidad inválida");
        }
        if (n > max) n = max;

        const cart = await this._getOrCreateCart(usuarioId);
        const items = cart.items;

        let it = this._findItem(cart, libroId);

        if (!it) {
            //  La cantidad del ítem nuevo YA es >= 1
            it = {
                libro: libro._id,
                libroId: String(libro._id),
                titulo: libro.titulo,
                precio: libro.precio,
                cantidad: n, // ya válido
                stock: max,
            };
            items.push(it);
        } else {
            // actualizar stock
            it.stock = max;
            // sumar cantidad sin pasar stock
            it.cantidad = Math.min(it.cantidad + n, it.stock);
        }

        await cart.save();
        return this._toResponse(cart);
    }

    async setQty(usuarioId, libroId, qty) {
        const cart = await this._getOrCreateCart(usuarioId);
        const items = cart.items;
        const it = this._findItem(cart, libroId);
        if (!it) throw new Error("Item no encontrado");

        const n = Number(qty);
        if (!Number.isFinite(n) || !Number.isInteger(n)) {
            throw new Error("Cantidad inválida");
        }
        if (n < 0) throw new Error("Cantidad inválida");

        const max = it.stock;

        if (n === 0) {
            const idx = items.indexOf(it);
            if (idx >= 0) items.splice(idx, 1);
        } else {
            it.cantidad = Math.min(n, max);
        }

        await cart.save();
        return this._toResponse(cart);
    }

    async inc(usuarioId, libroId) {
        const cart = await this._getOrCreateCart(usuarioId);
        const it = this._findItem(cart, libroId);
        if (!it) throw new Error("Item no encontrado");
        return this.setQty(usuarioId, libroId, it.cantidad + 1);
    }

    async dec(usuarioId, libroId) {
        const cart = await this._getOrCreateCart(usuarioId);
        const it = this._findItem(cart, libroId);
        if (!it) throw new Error("Item no encontrado");
        return this.setQty(usuarioId, libroId, it.cantidad - 1);
    }

    async remove(usuarioId, libroId) {
        const cart = await this._getOrCreateCart(usuarioId);
        const items = cart.items;

        const idStr = String(libroId);
        const idx = items.findIndex((x) => x.libroId === idStr);
        if (idx < 0) throw new Error("Item no encontrado");

        items.splice(idx, 1);
        await cart.save();
        return this._toResponse(cart);
    }

    async clear(usuarioId) {
        const cart = await this._getOrCreateCart(usuarioId);
        cart.items = [];
        await cart.save();
    }
}

export const cartService = new CartService();
