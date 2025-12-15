// src/db.mjs
import { Dynamo } from "./dynamo.mjs";


function createDB() {
    const provider = process.env.DB_PROVIDER ?? "Dynamo";

    if (provider === "Dynamo") {
        
        
        return new Dynamo({ persistFile: "./.dynamo.json" });
    }

    throw new Error(`DB_PROVIDER no soportado: ${provider}`);
}

export const db = createDB();
