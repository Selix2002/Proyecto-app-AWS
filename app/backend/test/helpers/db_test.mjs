import mongoose from "mongoose";

const MONGO_URL = "mongodb://127.0.0.1:27017/libreria_test";

export async function connectDB() {
    if (mongoose.connection.readyState === 1) {
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


// Borra todas las colecciones entre tests
export async function clearMongoTest() {
    const { collections } = mongoose.connection;
    const ops = Object.values(collections).map((c) => c.deleteMany({}));
    await Promise.all(ops);
}

export async function resetMongoTest() {
    await mongoose.connection.dropDatabase(); // elimina libreria_test
    await mongoose.disconnect();
}

