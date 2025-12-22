// src/db.mjs
import { Dynamo } from "./dynamo.mjs";
import { DynamoAWS } from "./dynamo-aws.mjs"; // ajusta ruta si corresponde
import dotenv from "dotenv";
dotenv.config();
function createDB() {
  const provider = process.env.DB_PROVIDER ?? "Dynamo";

  if (provider === "DynamoAWS") {
    return new DynamoAWS({
      tableName: process.env.DDB_TABLE,
      region: process.env.AWS_REGION,
    });
  }

  if (provider === "Dynamo") {
    return new Dynamo({ persistFile: "./.dynamo.json" });
  }

  throw new Error(`DB_PROVIDER no soportado: ${provider}`);
}

export const db = createDB();
