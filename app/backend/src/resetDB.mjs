// src/resetDB.mjs
import mongoose from "mongoose";


//Elimina toda la base de datos actual

export async function resetDatabase() {
    try {
        const db = mongoose.connection;

        if (!db || db.readyState !== 1) {
            console.warn("[DB] No hay conexión activa, no puedo hacer dropDatabase()");
            return;
        }

        console.log("[DB] Eliminando base de datos libreria...");
        await db.dropDatabase();
        console.log("[DB] Base de datos reiniciada.");
    } catch (err) {
        console.error("[DB] Error al hacer dropDatabase():", err.message);
    }
}
