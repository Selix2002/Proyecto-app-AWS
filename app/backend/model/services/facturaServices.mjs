// src/model/services/facturaServices.mjs
import crypto from "node:crypto";
import { db } from "../db/db.mjs";
import { cartService } from "./cartServices.mjs";

export class FacturaService {
  constructor() {
    this.TABLE = process.env.DDB_TABLE_ORDERS ?? "eugenio-orders";
    this.USERID_INDEX = process.env.DDB_ORDERS_USERID_INDEX ?? "UserIdIndex";
  }

  // ---------- Helpers internos ----------

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

  _normEmail(email) {
    return String(email ?? "").trim().toLowerCase();
  }

  _normUserId(userId) {
    const u = String(userId ?? "").trim();
    if (!u) throw new Error("ID de usuario no existe");
    return u;
  }

  _normOrderId(orderId) {
    const o = String(orderId ?? "").trim();
    if (!o) throw new Error("OrderId inválido");
    return o;
  }

  _toPublicOrder(order, { includeItems = true } = {}) {
    if (!order) return null;
    return {
      id: order.orderId,
      usuario: order.userId, // compat con tu respuesta anterior
      fechaISO: order.fechaISO,
      subtotal: order.subtotal,
      iva: order.iva,
      total: order.total,
      ivaRate: order.ivaRate,
      meta: order.meta,
      ...(includeItems ? { items: order.items ?? [] } : {}),
    };
  }

  // ---------- API pública ----------

  /**
   * createFromCart(userId, meta)
   * - Genera factura desde el carrito.
   * - Guarda 1 documento en Orders con items embebidos.
   * - Vacía el carrito si todo sale bien.
   */
  async createFromCart(usuarioId, meta = {}) {
    const userId = this._normUserId(usuarioId);
    this._validateMeta(meta);

    const resumen = await cartService.get(userId);
    if (!resumen?.items?.length) throw new Error("Carrito vacío");

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    const order = {
      // PK tabla
      orderId,

      // para el GSI UserIdIndex (partition key = userId)
      userId,

      // metadata + totales
      fechaISO: now,
      subtotal: resumen.subtotal,
      iva: resumen.iva,
      total: resumen.total,
      ivaRate: resumen.ivaRate ?? 0.04,

      meta: {
        razonSocial: String(meta.razonSocial).trim(),
        direccion: String(meta.direccion).trim(),
        dni: String(meta.dni).trim(),
        email: this._normEmail(meta.email),
      },

      // items embebidos (1 documento)
      items: resumen.items.map((x) => ({
        libroId: String(x.libroId ?? "").trim(),
        titulo: x.titulo,
        precio: Number(x.precio) || 0,
        cantidad: Number(x.cantidad) || 0,
        subtotal: Number(x.subtotal) || 0,
      })),

      createdAt: now,
      updatedAt: now,
    };

    // Unicidad por orderId
    await db.put({
      TableName: this.TABLE,
      Item: order,
      IfNotExists: "orderId",
    });

    // Vaciar carrito
    await cartService.clear(userId);

    return this._toPublicOrder(order, { includeItems: true });
  }

  /**
   * getAll(userId)
   * - Devuelve todas las facturas del usuario, más recientes primero.
   * - Usa Query por GSI: UserIdIndex (PK = userId)
   */
  async getAll(usuarioId) {
    const userId = this._normUserId(usuarioId);

    // Si tu wrapper tiene queryRaw, úsalo (recomendado)
    if (typeof db.queryRaw === "function") {
      const { Items } = await db.queryRaw({
        TableName: this.TABLE,
        IndexName: this.USERID_INDEX,
        KeyConditionExpression: "#u = :u",
        ExpressionAttributeNames: { "#u": "userId" },
        ExpressionAttributeValues: { ":u": userId },
      });

      const orders = Items ?? [];
      orders.sort((a, b) => String(b.fechaISO ?? "").localeCompare(String(a.fechaISO ?? "")));

      return orders.map((o) => this._toPublicOrder(o, { includeItems: false }));
    }

    // Fallback ultra simple (por si no aplicaste el wrapper nuevo):
    // Scan + filtro (funciona, pero lento)
    const { Items } = await db.scan({ TableName: this.TABLE });
    const orders = (Items ?? []).filter((o) => String(o.userId ?? "") === userId);
    orders.sort((a, b) => String(b.fechaISO ?? "").localeCompare(String(a.fechaISO ?? "")));
    return orders.map((o) => this._toPublicOrder(o, { includeItems: false }));
  }

  /**
   * getById(userId, orderId)
   * - GetItem directo por PK orderId.
   * - Valida que pertenezca al userId.
   */
  async getById(usuarioId, orderId) {
    const userId = this._normUserId(usuarioId);
    const oid = this._normOrderId(orderId);

    const { Item } = await db.get({
      TableName: this.TABLE,
      Key: { orderId: oid },
    });

    if (!Item) return null;
    if (String(Item.userId ?? "") !== userId) return null;

    return this._toPublicOrder(Item, { includeItems: true });
  }

  // ---------- Admin/testing ----------

  async getAllGlobal() {
    const { Items } = await db.scan({ TableName: this.TABLE });
    const orders = Items ?? [];
    orders.sort((a, b) => String(b.fechaISO ?? "").localeCompare(String(a.fechaISO ?? "")));
    return orders.map((o) => this._toPublicOrder(o, { includeItems: false }));
  }

  async removeAllGlobal() {
    const { Items } = await db.scan({ TableName: this.TABLE });
    for (const it of Items ?? []) {
      const oid = String(it.orderId ?? "").trim();
      if (!oid) continue;
      await db.delete({ TableName: this.TABLE, Key: { orderId: oid } }).catch(() => {});
    }
  }

  async getByIdGlobal(orderId) {
    const oid = this._normOrderId(orderId);

    const { Item } = await db.get({
      TableName: this.TABLE,
      Key: { orderId: oid },
    });

    return Item ? this._toPublicOrder(Item, { includeItems: true }) : null;
  }
}

export const facturaService = new FacturaService();
