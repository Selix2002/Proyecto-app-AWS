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
  const provider = (process.env.DB_PROVIDER ?? (isLambda ? "DynamoAWS" : "Dynamo")).trim();

  if (provider === "DynamoAWS") {
    const region = process.env.AWS_REGION ?? "us-east-1";

    // ✅ Multi-tabla: NO amarres un tableName acá.
    // Cada service debe pasar TableName en db.get/put/update/scan/queryRaw.
    return new DynamoAWS({ region });
  }

  if (provider === "Dynamo") {
    return new Dynamo({ persistFile: "./.dynamo.json" });
  }

  throw new Error(`DB_PROVIDER no soportado: ${provider}`);
}

export const db = createDB();
