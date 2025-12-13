// src/model/services/libroService.mjs
import { Libro } from "../schema/libro.mjs";

export class LibroService {
    async getLibros() {
        const docs = await Libro.find().exec();
        return docs;
    }

    async getLibroPorId(id) {
        if (!id) return null;
        return Libro.findById(id).exec();
    }

    async addLibro(data) {
        // Requeridos
        const req = ["isbn", "titulo", "autores"];
        for (const k of req) {
            const v = String(data[k] ?? "").trim();
            if (!v) throw new Error(`Falta el campo: ${k}`);
            data[k] = v;
        }

        // Unicidad por ISBN
        const isbn = data.isbn;
        const exists = await Libro.findOne({ isbn }).exec();
        if (exists) throw new Error("El ISBN ya existe");

        // Stock
        const stock = Number(data.stock);
        if (!Number.isFinite(stock)) throw new Error("Stock inválido");
        if (!Number.isInteger(stock)) throw new Error("Stock inválido");
        if (stock <= 0) throw new Error("Stock inválido");

        // Precio
        const precio = Number(data.precio);
        if (!Number.isFinite(precio)) throw new Error("Precio inválido");
        if (precio <= 0) throw new Error("Precio inválido");

        data.stock = stock;
        data.precio = precio;

        const nuevo = await Libro.create(data);
        return nuevo;
    }

    async updateLibro(id, patch) {
        const libro = await this.getLibroPorId(id);
        if (!libro) throw new Error("Libro no encontrado");

        Object.assign(libro, patch);
        return libro.save();
    }

    async removeLibro(id) {
        const result = await Libro.findByIdAndDelete(id).exec();
        if (!result) throw new Error("Libro no encontrado");
    }
}

export const libroService = new LibroService();
