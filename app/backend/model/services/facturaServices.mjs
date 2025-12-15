// src/model/services/facturaServices.mjs
import crypto from "node:crypto";
import { db } from "../db/db.mjs";

import { cartService } from "./cartServices.mjs";  // 👈 ajusta ruta

export class FacturaService {
    constructor() {
        this.TABLE = "Orders";
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

    _orderPk(usuarioId) {
        const u = String(usuarioId ?? "").trim();
        if (!u) throw new Error("ID de usuario no existe");
        return `ORDER#USER#${u}`;
    }

    _orderSk(orderId) {
        const o = String(orderId ?? "").trim();
        if (!o) throw new Error("OrderId inválido");
        return `ORDER#${o}`;
    }

    // ---------- API pública ----------

    /**
     * createFromCart(userId, meta)
     * - Genera factura desde el carrito Dynamo.
     * - Vacía el carrito si todo sale bien.
     */
    async createFromCart(usuarioId, meta = {}) {
        if (!usuarioId) throw new Error("ID de usuario no existe");
        this._validateMeta(meta);

        // Tomar carrito ya “resumido”
        const resumen = await cartService.get(usuarioId);
        if (!resumen?.items?.length) throw new Error("Carrito vacío");

        const orderId = crypto.randomUUID();
        const pk = this._orderPk(usuarioId);
        const sk = this._orderSk(orderId);

        const header = {
            pk,
            sk,
            orderId,
            usuarioId: String(usuarioId),
            fechaISO: new Date().toISOString(),
            subtotal: resumen.subtotal,
            iva: resumen.iva,
            total: resumen.total,
            ivaRate: resumen.ivaRate ?? 0.04,
            meta: {
                razonSocial: String(meta.razonSocial).trim(),
                direccion: String(meta.direccion).trim(),
                dni: String(meta.dni).trim(),
                email: String(meta.email).trim().toLowerCase(),
            },
            createdAt: new Date().toISOString(),
        };

        // Guardar header
        await db.put({ TableName: this.TABLE, Item: header, IfNotExists: true });

        // Guardar items
        for (const it of resumen.items) {
            const libroId = String(it.libroId ?? "").trim(); // isbn
            const item = {
                pk,
                sk: `${sk}#ITEM#${libroId}`,
                orderId,
                usuarioId: String(usuarioId),
                libroId,
                titulo: it.titulo,
                precio: it.precio,
                cantidad: it.cantidad,
                subtotal: it.subtotal,
                createdAt: header.createdAt,
            };
            await db.put({ TableName: this.TABLE, Item: item, IfNotExists: true });
        }

        // Vaciar carrito
        await cartService.clear(usuarioId);

        // Devolver estructura similar a Mongoose (sin _id real)
        return {
            id: orderId,
            usuario: String(usuarioId),
            fechaISO: header.fechaISO,
            subtotal: header.subtotal,
            iva: header.iva,
            total: header.total,
            ivaRate: header.ivaRate,
            items: resumen.items.map((x) => ({
                libroId: x.libroId,
                titulo: x.titulo,
                precio: x.precio,
                cantidad: x.cantidad,
                subtotal: x.subtotal,
            })),
            meta: header.meta,
        };
    }

    /**
     * getAll(userId)
     * - Devuelve todas las facturas (headers) del usuario, más recientes primero.
     */
    async getAll(usuarioId) {
        const pk = this._orderPk(usuarioId);

        const { Items } = await db.query({
            TableName: this.TABLE,
            pk,
            beginsWithSk: "ORDER#",
        });

        // Items trae headers + items. Nos quedamos solo con headers (sk == ORDER#uuid)
        const headers = (Items ?? []).filter((it) => {
            const sk = String(it.sk ?? it.SK ?? "");
            return sk.startsWith("ORDER#") && !sk.includes("#ITEM#");
        });

        // ordenar por fecha desc (simula createdAt desc)
        headers.sort((a, b) => String(b.fechaISO ?? "").localeCompare(String(a.fechaISO ?? "")));

        // devolver “factura” sin items (o si quieres, con items, pero es más caro)
        return headers.map((h) => ({
            id: h.orderId,
            usuario: h.usuarioId,
            fechaISO: h.fechaISO,
            subtotal: h.subtotal,
            iva: h.iva,
            total: h.total,
            ivaRate: h.ivaRate,
            meta: h.meta,
        }));
    }

    /**
     * getById(userId, orderId)
     * - Devuelve header + items de la factura.
     */
    async getById(usuarioId, orderId) {
        if (!usuarioId || !orderId) return null;

        const pk = this._orderPk(usuarioId);
        const sk = this._orderSk(orderId);

        const { Item: header } = await db.get({
            TableName: this.TABLE,
            Key: { pk, sk },
        });

        if (!header) return null;

        const { Items } = await db.query({
            TableName: this.TABLE,
            pk,
            beginsWithSk: `${sk}#ITEM#`,
        });

        const items = (Items ?? []).map((it) => ({
            libroId: it.libroId,
            titulo: it.titulo,
            precio: it.precio,
            cantidad: it.cantidad,
            subtotal: it.subtotal,
        }));

        return {
            id: header.orderId,
            usuario: header.usuarioId,
            fechaISO: header.fechaISO,
            subtotal: header.subtotal,
            iva: header.iva,
            total: header.total,
            ivaRate: header.ivaRate,
            items,
            meta: header.meta,
        };
    }
    // ✅ equivalente a Factura.find() (admin/testing)
    async getAllGlobal() {
        const { Items } = await db.scan({ TableName: this.TABLE });

        const headers = (Items ?? []).filter((it) => {
            const sk = String(it.sk ?? it.SK ?? "");
            return sk.startsWith("ORDER#") && !sk.includes("#ITEM#");
        });

        headers.sort((a, b) => String(b.fechaISO ?? "").localeCompare(String(a.fechaISO ?? "")));

        return headers.map((h) => ({
            id: h.orderId,
            usuario: h.usuarioId,
            fechaISO: h.fechaISO,
            subtotal: h.subtotal,
            iva: h.iva,
            total: h.total,
            ivaRate: h.ivaRate,
            meta: h.meta,
        }));
    }

    // ✅ borrar todas (admin/testing)
    async removeAllGlobal() {
        const { Items } = await db.scan({ TableName: this.TABLE });
        for (const it of Items ?? []) {
            await db.delete({ TableName: this.TABLE, Key: { pk: it.pk, sk: it.sk } });
        }
    }

    // ✅ buscar por numero/id (admin/testing) sin userId
    async getByIdGlobal(orderId) {
        const { Items } = await db.scan({ TableName: this.TABLE });

        const header = (Items ?? []).find((it) => {
            const sk = String(it.sk ?? it.SK ?? "");
            return it.orderId === orderId && sk.startsWith("ORDER#") && !sk.includes("#ITEM#");
        });
        if (!header) return null;

        const pk = header.pk;
        const sk = header.sk;
        const { Items: orderItems } = await db.query({
            TableName: this.TABLE,
            pk,
            beginsWithSk: `${sk}#ITEM#`,
        });

        return {
            id: header.orderId,
            usuario: header.usuarioId,
            fechaISO: header.fechaISO,
            subtotal: header.subtotal,
            iva: header.iva,
            total: header.total,
            ivaRate: header.ivaRate,
            meta: header.meta,
            items: (orderItems ?? []).map((x) => ({
                libroId: x.libroId,
                titulo: x.titulo,
                precio: x.precio,
                cantidad: x.cantidad,
                subtotal: x.subtotal,
            })),
        };
    }
}

export const facturaService = new FacturaService();
