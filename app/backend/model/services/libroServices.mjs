// src/model/services/libroService.mjs
import { db } from "../db/db.mjs";

const TABLE = process.env.DDB_TABLE_BOOKS ?? "eugenio-books";
const PK = "bookId";

function normalizeBookId(idOrIsbn) {
    const v = String(idOrIsbn ?? "").trim();
    if (!v) return null;
    return v; // bookId = isbn
}

function toPublicLibro(item) {
    if (!item) return null;
    return {
        id: item.isbn, // compat
        isbn: item.isbn,
        titulo: item.titulo,
        autores: item.autores,
        resumen: item.resumen,
        stock: item.stock,
        precio: item.precio,
    };
}

function assertRequiredStrings(data, keys) {
    for (const k of keys) {
        const v = String(data[k] ?? "").trim();
        if (!v) throw new Error(`Falta el campo: ${k}`);
        data[k] = v;
    }
}

function parsePositiveInt(val, name) {
    const n = Number(val);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) throw new Error(`${name} inválido`);
    return n;
}

function parsePositiveNumber(val, name) {
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} inválido`);
    return n;
}

export class LibroService {
    async getLibros() {
        const { Items } = await db.scan({ TableName: TABLE });
        return (Items ?? []).map(toPublicLibro);
    }

    async getLibroPorId(id) {
        const bookId = normalizeBookId(id);
        if (!bookId) return null;

        const { Item } = await db.get({
            TableName: TABLE,
            Key: { [PK]: bookId },
        });

        return toPublicLibro(Item);
    }

    async addLibro(data) {
        data = data ?? {};

        assertRequiredStrings(data, ["isbn", "titulo", "autores"]);
        if (data.resumen == null) data.resumen = "";
        data.resumen = String(data.resumen ?? "").trim();

        const stock = parsePositiveInt(data.stock, "Stock");
        const precio = parsePositiveNumber(data.precio, "Precio");

        const isbn = data.isbn;
        const bookId = isbn; // decisión: PK = isbn

        const Item = {
            [PK]: bookId,
            isbn,
            titulo: data.titulo,
            autores: data.autores,
            resumen: data.resumen,
            stock,
            precio,
            createdAt: new Date().toISOString(),
        };

        try {
            // unicidad por PK
            await db.put({ TableName: TABLE, Item, IfNotExists: PK });
        } catch (e) {
            if (String(e.message).includes("ConditionalCheckFailed")) {
                throw new Error("El ISBN ya existe");
            }
            throw e;
        }

        return toPublicLibro(Item);
    }

    async updateLibro(id, patch) {
        const bookId = normalizeBookId(id);
        if (!bookId) throw new Error("Libro no encontrado");

        const { Item: current } = await db.get({
            TableName: TABLE,
            Key: { [PK]: bookId },
        });

        if (!current) throw new Error("Libro no encontrado");

        patch = patch ?? {};

        // Si PK = isbn, no permitas cambiar isbn
        if (patch.isbn && String(patch.isbn).trim() !== current.isbn) {
            throw new Error("No se puede cambiar el ISBN");
        }

        const Patch = {};
        if (patch.titulo != null) {
            const v = String(patch.titulo).trim();
            if (!v) throw new Error("titulo inválido");
            Patch.titulo = v;
        }
        if (patch.autores != null) {
            const v = String(patch.autores).trim();
            if (!v) throw new Error("autores inválido");
            Patch.autores = v;
        }
        if (patch.resumen != null) Patch.resumen = String(patch.resumen).trim();
        if (patch.stock != null) Patch.stock = parsePositiveInt(patch.stock, "Stock");
        if (patch.precio != null) Patch.precio = parsePositiveNumber(patch.precio, "Precio");

        if (Object.keys(Patch).length === 0) return toPublicLibro(current);

        Patch.updatedAt = new Date().toISOString();

        const { Attributes } = await db.update({
            TableName: TABLE,
            Key: { [PK]: bookId },
            Patch,
        });

        return toPublicLibro(Attributes);
    }

    async removeLibro(id) {
        const bookId = normalizeBookId(id);
        if (!bookId) throw new Error("Libro no encontrado");

        const { Item } = await db.get({
            TableName: TABLE,
            Key: { [PK]: bookId },
        });
        if (!Item) throw new Error("Libro no encontrado");

        await db.delete({
            TableName: TABLE,
            Key: { [PK]: bookId },
        });
    }

    async removeAll() {
        const { Items } = await db.scan({ TableName: TABLE });
        for (const it of Items ?? []) {
            const bookId = it?.[PK];
            if (!bookId) continue;
            await db.delete({ TableName: TABLE, Key: { [PK]: bookId } });
        }
    }

    async replaceAll(arr) {
        const list = Array.isArray(arr) ? arr : [];
        await this.removeAll();

        for (const data of list) {
            await this.addLibro(data);
        }
        return this.getLibros();
    }
}

export const libroService = new LibroService();
