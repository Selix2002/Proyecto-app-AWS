// src/model/services/cartServices.mjs
import { db } from "../db/db.mjs";


export class CartService {
  constructor() {
    this.IVA_LIBROS = 0.04;
    this.TABLE_CARTS = "Carts";
    this.TABLE_BOOKS = "Books";
  }

  _cartPk(usuarioId) {
    const u = String(usuarioId ?? "").trim();
    if (!u) throw new Error("ID de usuario no existe");
    return `CART#USER#${u}`;
  }

  _itemSk(isbn) {
    const v = String(isbn ?? "").trim();
    if (!v) throw new Error("Libro inválido");
    return `ITEM#BOOK#${v}`;
  }

  async _getBookById(libroId) {
    // libroId = isbn
    const isbn = String(libroId ?? "").trim();
    if (!isbn) return null;

    const { Item } = await db.get({
      TableName: this.TABLE_BOOKS,
      Key: { pk: `BOOK#${isbn}`, sk: "META#" },
    });

    return Item ?? null;
  }

  async _getOrCreateCart(usuarioId) {
    const pk = this._cartPk(usuarioId);

    // 1) meta
    let { Item: meta } = await db.get({
      TableName: this.TABLE_CARTS,
      Key: { pk, sk: "META#" },
    });

    if (!meta) {
      meta = { pk, sk: "META#", ivaRate: this.IVA_LIBROS, createdAt: new Date().toISOString() };
      await db.put({ TableName: this.TABLE_CARTS, Item: meta, IfNotExists: true });
    } else if (meta.ivaRate == null) {
      meta.ivaRate = this.IVA_LIBROS;
      await db.update({
        TableName: this.TABLE_CARTS,
        Key: { pk, sk: "META#" },
        Patch: meta,
      });
    }

    // 2) items
    const { Items } = await db.query({
      TableName: this.TABLE_CARTS,
      pk,
      beginsWithSk: "ITEM#BOOK#",
    });

    const items = (Items ?? []).map((it) => ({
      libroId: it.libroId,
      titulo: it.titulo,
      precio: it.precio,
      cantidad: it.cantidad,
      stock: it.stock,
    }));

    return { pk, ivaRate: meta.ivaRate ?? this.IVA_LIBROS, items };
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
    const libro = await this._getBookById(libroId);
    if (!libro) throw new Error("Libro no encontrado");

    const max = Number(libro.stock) || 0;
    if (max <= 0) throw new Error("Sin stock");

    let n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) throw new Error("Cantidad inválida");
    if (n > max) n = max;

    const cart = await this._getOrCreateCart(usuarioId);
    const pk = cart.pk;

    const isbn = String(libroId ?? "").trim();
    const sk = this._itemSk(isbn);

    // buscar item actual en Dynamo
    const { Item: current } = await db.get({
      TableName: this.TABLE_CARTS,
      Key: { pk, sk },
    });

    if (!current) {
      const item = {
        pk,
        sk,
        libroId: isbn,
        titulo: libro.titulo,
        precio: Number(libro.precio),
        cantidad: n,
        stock: max,
        createdAt: new Date().toISOString(),
      };

      await db.put({ TableName: this.TABLE_CARTS, Item: item, IfNotExists: true });
      cart.items.push({ libroId: item.libroId, titulo: item.titulo, precio: item.precio, cantidad: item.cantidad, stock: item.stock });
    } else {
      // actualizar stock + sumar cantidad sin pasar stock
      const updated = {
        ...current,
        stock: max,
        titulo: libro.titulo,           // opcional: refrescar
        precio: Number(libro.precio),   // opcional: refrescar
      };
      updated.cantidad = Math.min(Number(current.cantidad) + n, updated.stock);

      await db.update({
        TableName: this.TABLE_CARTS,
        Key: { pk, sk },
        Patch: updated,
      });

      // reflejar en cart en memoria
      const it = this._findItem(cart, isbn);
      if (it) {
        it.stock = updated.stock;
        it.titulo = updated.titulo;
        it.precio = updated.precio;
        it.cantidad = updated.cantidad;
      } else {
        cart.items.push({ libroId: updated.libroId, titulo: updated.titulo, precio: updated.precio, cantidad: updated.cantidad, stock: updated.stock });
      }
    }

    return this._toResponse(cart);
  }

  async setQty(usuarioId, libroId, qty) {
    const cart = await this._getOrCreateCart(usuarioId);
    const pk = cart.pk;

    const isbn = String(libroId ?? "").trim();
    const sk = this._itemSk(isbn);

    const { Item: current } = await db.get({
      TableName: this.TABLE_CARTS,
      Key: { pk, sk },
    });
    if (!current) throw new Error("Item no encontrado");

    const n = Number(qty);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      throw new Error("Cantidad inválida");
    }

    const max = Number(current.stock) || 0;

    if (n === 0) {
      await db.delete({ TableName: this.TABLE_CARTS, Key: { pk, sk } });
      cart.items = cart.items.filter((x) => x.libroId !== isbn);
      return this._toResponse(cart);
    }

    const updated = { ...current, cantidad: Math.min(n, max) };

    await db.update({
      TableName: this.TABLE_CARTS,
      Key: { pk, sk },
      Patch: updated,
    });

    const it = this._findItem(cart, isbn);
    if (it) it.cantidad = updated.cantidad;

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
    const pk = cart.pk;

    const isbn = String(libroId ?? "").trim();
    const sk = this._itemSk(isbn);

    const { Item } = await db.get({ TableName: this.TABLE_CARTS, Key: { pk, sk } });
    if (!Item) throw new Error("Item no encontrado");

    await db.delete({ TableName: this.TABLE_CARTS, Key: { pk, sk } });
    cart.items = cart.items.filter((x) => x.libroId !== isbn);

    return this._toResponse(cart);
  }

  async clear(usuarioId) {
    const cart = await this._getOrCreateCart(usuarioId);
    const pk = cart.pk;

    const { Items } = await db.query({
      TableName: this.TABLE_CARTS,
      pk,
      beginsWithSk: "ITEM#BOOK#",
    });

    for (const it of Items ?? []) {
      await db.delete({ TableName: this.TABLE_CARTS, Key: { pk, sk: it.sk ?? it.SK } });
    }

    // no borramos META#, solo items
    cart.items = [];
  }
}

export const cartService = new CartService();
