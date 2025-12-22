// src/model/services/libroService.mjs
import { db } from "../db/db.mjs";
const TABLE = "Books";
const SK_META = "META#";

function normalizePk(idOrIsbn) {
    const v = String(idOrIsbn ?? "").trim();
    if (!v) return null;
    return v.startsWith("BOOK#") ? v : `BOOK#${v}`;
}

function toPublicLibro(item) {
    if (!item) return null;
    // “id” para compatibilidad con tu API anterior
    return {
        id: item.isbn,          // <- usa isbn como id público
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
    console.log("parsePositiveInt:", val, "->", n);
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

        const libros = (Items ?? [])
            .filter((it) => String(it.pk ?? "").startsWith("BOOK#") && (it.sk ?? it.SK) === SK_META)
            .map(toPublicLibro);

        return libros;
    }

    async getLibroPorId(id) {
        const pk = normalizePk(id);
        if (!pk) return null;

        const { Item } = await db.get({
            TableName: TABLE,
            Key: { pk, sk: SK_META },
        });

        return toPublicLibro(Item);
    }

    async addLibro(data) {
        data = data ?? {};

        // Requeridos (igual que antes)
        assertRequiredStrings(data, ["isbn", "titulo", "autores"]);

        // Si quieres mantener resumen como requerido como en tu schema, agrega aquí:
        if (data.resumen == null) data.resumen = ""; // o valida requerido si corresponde
        data.resumen = String(data.resumen ?? "").trim();

        // Stock / Precio (igual que antes)
        const stock = parsePositiveInt(data.stock, "Stock");
        const precio = parsePositiveNumber(data.precio, "Precio");

        const isbn = data.isbn;

        const Item = {
            pk: `BOOK#${isbn}`,
            sk: SK_META,
            isbn,
            titulo: data.titulo,
            autores: data.autores,
            resumen: data.resumen,
            stock,
            precio,
            createdAt: new Date().toISOString(),
        };

        // ✅ Unicidad por ISBN (simula ConditionExpression)
        // ✅ Si la tabla no existe, db.put fallará por tu _table()
        try {
            await db.put({ TableName: TABLE, Item, IfNotExists: true });
        } catch (e) {
            if (String(e.message).includes("ConditionalCheckFailed")) {
                throw new Error("El ISBN ya existe");
            }
            throw e;
        }

        return toPublicLibro(Item);
    }

    async updateLibro(id, patch) {
        const pk = normalizePk(id);
        if (!pk) throw new Error("Libro no encontrado");

        const { Item: current } = await db.get({ TableName: TABLE, Key: { pk, sk: SK_META } });
        if (!current) throw new Error("Libro no encontrado");

        patch = patch ?? {};

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
            Key: { pk, sk: SK_META },
            Patch,
        });

        return toPublicLibro(Attributes);
    }


    async removeLibro(id) {
        const pk = normalizePk(id);
        if (!pk) throw new Error("Libro no encontrado");

        const { Item } = await db.get({
            TableName: TABLE,
            Key: { pk, sk: SK_META },
        });
        if (!Item) throw new Error("Libro no encontrado");

        await db.delete({
            TableName: TABLE,
            Key: { pk, sk: SK_META },
        });
    }

    async removeAll() {
        const { Items } = await db.scan({ TableName: TABLE });

        const books = (Items ?? []).filter(
            (it) => String(it.pk ?? "").startsWith("BOOK#") && (it.sk ?? it.SK) === SK_META
        );

        for (const it of books) {
            await db.delete({ TableName: TABLE, Key: { pk: it.pk, sk: it.sk ?? it.SK ?? "__nosk__" } });
        }
    }


    async replaceAll(arr) {
        const list = Array.isArray(arr) ? arr : [];
        await this.removeAll();

        const nuevos = [];
        for (const data of list) {
            const libro = await this.addLibro(data);
            nuevos.push(libro);
        }
        return this.getLibros();
    }
}

export const libroService = new LibroService();
