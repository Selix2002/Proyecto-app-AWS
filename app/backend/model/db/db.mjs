// model/db/db.mjs  (ajusta ruta a tu caso)
import { Dynamo } from "./dynamo.mjs";
import { DynamoAWS } from "./dynamo-aws.mjs";
import dotenv from "dotenv";

const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Carga .env solo en local (si existe)
if (!isLambda) {
  dotenv.config();
}

function createDB() {
  // Si no viene definido, decide por contexto:
  // - Lambda => DynamoAWS
  // - Local  => Dynamo (archivo)
  const provider = (process.env.DB_PROVIDER ?? (isLambda ? "DynamoAWS" : "Dynamo")).trim();

  if (provider === "DynamoAWS") {
    const tableName = process.env.DDB_TABLE;
    if (!tableName) throw new Error("Falta DDB_TABLE en variables de entorno");

    // AWS_REGION en Lambda normalmente viene seteado por AWS igual,
    // pero si no, usa fallback.
    const region = process.env.AWS_REGION ?? "us-east-1";

    return new DynamoAWS({ tableName, region });
  }

  if (provider === "Dynamo") {
    // Solo local: persiste en archivo del proyecto
    return new Dynamo({ persistFile: "./.dynamo.json" });
  }

  throw new Error(`DB_PROVIDER no soportado: ${provider}`);
}

export const db = createDB();
