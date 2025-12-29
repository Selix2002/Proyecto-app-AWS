import { db } from "../db/db.mjs";

export class CartService {
  constructor() {
    this.IVA_LIBROS = 0.04;

    // ✅ nuevas tablas reales
    this.TABLE_CARTS = process.env.DDB_TABLE_CARTS ?? "eugenio-carts";
    this.TABLE_BOOKS = process.env.DDB_TABLE_BOOKS ?? "eugenio-books";

    this.CART_PK = "userId";
    this.BOOK_PK = "bookId"; // asumimos bookId = isbn
  }

  _cartKey(usuarioId) {
    const u = String(usuarioId ?? "").trim();
    if (!u) throw new Error("ID de usuario no existe");
    return { [this.CART_PK]: u };
  }

  _isbn(libroId) {
    const v = String(libroId ?? "").trim();
    if (!v) throw new Error("Libro inválido");
    return v;
  }

  async _getBookById(libroId) {
    const isbn = this._isbn(libroId);

    const { Item } = await db.get({
      TableName: this.TABLE_BOOKS,
      Key: { [this.BOOK_PK]: isbn },
    });

    return Item ?? null;
  }

  async _getOrCreateCart(usuarioId) {
    const Key = this._cartKey(usuarioId);
    const userId = Key[this.CART_PK];

    let { Item } = await db.get({ TableName: this.TABLE_CARTS, Key });

    if (!Item) {
      Item = {
        userId,
        ivaRate: this.IVA_LIBROS,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Unicidad por userId (si tu DynamoAWS soporta IfNotExists:"userId")
      await db.put({ TableName: this.TABLE_CARTS, Item, IfNotExists: this.CART_PK });
    } else {
      // normaliza campos faltantes
      if (Item.ivaRate == null) Item.ivaRate = this.IVA_LIBROS;
      if (!Array.isArray(Item.items)) Item.items = [];
    }

    return Item;
  }

  _findItem(cart, libroId) {
    const isbn = String(libroId);
    return (cart.items ?? []).find((it) => String(it.libroId) === isbn);
  }

  _toResponse(cart) {
    const ivaRate = Number(cart.ivaRate ?? this.IVA_LIBROS) || this.IVA_LIBROS;

    const items = (cart.items ?? []).map((it) => {
      const precio = Number(it.precio) || 0;
      const cantidad = Number(it.cantidad) || 0;
      const subtotal = precio * cantidad;

      return {
        libroId: it.libroId,
        titulo: it.titulo,
        precio,
        cantidad,
        stock: Number(it.stock) || 0,
        subtotal,
      };
    });

    const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
    const iva = subtotal * ivaRate;
    const total = subtotal + iva;

    return { items, subtotal, iva, total, ivaRate };
  }

  async _persistCart(userId, cart) {
    const now = new Date().toISOString();

    const Patch = {
      ivaRate: cart.ivaRate ?? this.IVA_LIBROS,
      items: cart.items ?? [],
      updatedAt: now,
    };

    const { Attributes } = await db.update({
      TableName: this.TABLE_CARTS,
      Key: { [this.CART_PK]: userId },
      Patch,
    });

    return Attributes ?? { ...cart, ...Patch };
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
    n = Math.min(Math.floor(n), max);

    const cart = await this._getOrCreateCart(usuarioId);
    const userId = cart.userId;

    const isbn = this._isbn(libroId);
    const existing = this._findItem(cart, isbn);

    if (!existing) {
      cart.items.push({
        libroId: isbn,
        titulo: libro.titulo,
        precio: Number(libro.precio) || 0,
        cantidad: n,
        stock: max,
      });
    } else {
      // refresca datos + suma
      existing.titulo = libro.titulo;
      existing.precio = Number(libro.precio) || 0;
      existing.stock = max;
      existing.cantidad = Math.min((Number(existing.cantidad) || 0) + n, max);
    }

    const saved = await this._persistCart(userId, cart);
    return this._toResponse(saved);
  }

  async setQty(usuarioId, libroId, qty) {
    const cart = await this._getOrCreateCart(usuarioId);
    const userId = cart.userId;

    const isbn = this._isbn(libroId);
    const existing = this._findItem(cart, isbn);
    if (!existing) throw new Error("Item no encontrado");

    const n = Number(qty);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      throw new Error("Cantidad inválida");
    }

    if (n === 0) {
      cart.items = cart.items.filter((x) => String(x.libroId) !== isbn);
      const saved = await this._persistCart(userId, cart);
      return this._toResponse(saved);
    }

    // (opcional) refrescar stock desde books para no dejar qty > stock
    const libro = await this._getBookById(isbn);
    const max = Number(libro?.stock ?? existing.stock) || 0;

    existing.stock = max;
    existing.titulo = libro?.titulo ?? existing.titulo;
    existing.precio = Number(libro?.precio ?? existing.precio) || 0;
    existing.cantidad = Math.min(n, max);

    const saved = await this._persistCart(userId, cart);
    return this._toResponse(saved);
  }

  async inc(usuarioId, libroId) {
    const cart = await this._getOrCreateCart(usuarioId);
    const it = this._findItem(cart, libroId);
    if (!it) throw new Error("Item no encontrado");
    return this.setQty(usuarioId, libroId, (Number(it.cantidad) || 0) + 1);
  }

  async dec(usuarioId, libroId) {
    const cart = await this._getOrCreateCart(usuarioId);
    const it = this._findItem(cart, libroId);
    if (!it) throw new Error("Item no encontrado");
    return this.setQty(usuarioId, libroId, (Number(it.cantidad) || 0) - 1);
  }

  async remove(usuarioId, libroId) {
    const cart = await this._getOrCreateCart(usuarioId);
    const userId = cart.userId;

    const isbn = this._isbn(libroId);
    const existing = this._findItem(cart, isbn);
    if (!existing) throw new Error("Item no encontrado");

    cart.items = cart.items.filter((x) => String(x.libroId) !== isbn);

    const saved = await this._persistCart(userId, cart);
    return this._toResponse(saved);
  }

  async clear(usuarioId) {
    const cart = await this._getOrCreateCart(usuarioId);
    cart.items = [];

    await this._persistCart(cart.userId, cart);
  }
}

export const cartService = new CartService();
