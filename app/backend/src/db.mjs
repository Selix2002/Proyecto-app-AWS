// src/db.mjs
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config(); 

const MONGO_URL =
    process.env.NODE_ENV === "test"
        ? process.env.MONGO_URL_TEST
        : process.env.MONGO_URL;

export async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        // ya conectado
        return;
    }

    try {
        await mongoose.connect(MONGO_URL, {
            autoIndex: true,
        });

        console.log("[DB] Conectado a MongoDB:", MONGO_URL);
    } catch (err) {
        console.error("[DB] Error al conectar a MongoDB:", err);
        throw err;
    }
}

export async function disconnectDB() {
    try {
        await mongoose.disconnect();
        console.log("[DB] Desconectado de MongoDB");
    } catch (err) {
        console.error("[DB] Error al desconectar de MongoDB:", err);
    }
}

mongoose.connection.on("connected", () => {
    console.log("[DB] Mongoose connection opened");
});

mongoose.connection.on("error", (err) => {
    console.error("[DB] Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
    console.log("[DB] Mongoose connection disconnected");
});
