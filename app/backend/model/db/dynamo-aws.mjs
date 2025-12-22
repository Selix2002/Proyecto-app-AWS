// src/db/dynamo-aws.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

function buildUpdateExpression(patch = {}) {
  const keys = Object.keys(patch);
  if (keys.length === 0) return null;

  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};
  const sets = [];

  let i = 0;
  for (const k of keys) {
    i += 1;
    const name = `#n${i}`;
    const val = `:v${i}`;
    ExpressionAttributeNames[name] = k;
    ExpressionAttributeValues[val] = patch[k];
    sets.push(`${name} = ${val}`);
  }

  return {
    UpdateExpression: `SET ${sets.join(", ")}`,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };
}

export class DynamoAWS {
  constructor({ tableName, region } = {}) {
    if (!tableName) throw new Error("DynamoAWS requiere tableName (DDB_TABLE)");

    const client = new DynamoDBClient({
      region: region ?? process.env.AWS_REGION ?? "us-east-1",
      // credenciales: las toma solas desde tu AWS CLI / env vars
    });

    this.ddb = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });

    this.tableName = tableName;
  }

  // En AWS hay una sola tabla física (la de Terraform)
  _table() {
    return this.tableName;
  }

  createTable() {
    // no-op (Terraform ya la crea)
  }

  async put({ Item, IfNotExists = false }) {
    await this.ddb.send(
      new PutCommand({
        TableName: this._table(),
        Item,
        ...(IfNotExists
          ? { ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)" }
          : {}),
      })
    );
    return {};
  }

  async get({ Key }) {
    const resp = await this.ddb.send(
      new GetCommand({
        TableName: this._table(),
        Key,
      })
    );
    return { Item: resp.Item };
  }

  async delete({ Key }) {
    await this.ddb.send(
      new DeleteCommand({
        TableName: this._table(),
        Key,
      })
    );
    return {};
  }

  async scan() {
    // scan paginado
    let Items = [];
    let ExclusiveStartKey = undefined;

    do {
      const resp = await this.ddb.send(
        new ScanCommand({
          TableName: this._table(),
          ExclusiveStartKey,
        })
      );
      Items.push(...(resp.Items ?? []));
      ExclusiveStartKey = resp.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return { Items };
  }


  async query({ pk, beginsWithSk, skEq, limit } = {}) {
    if (!pk) throw new Error("query requiere pk");

    const ExpressionAttributeNames = {
      "#pk": "pk",
    };
    const ExpressionAttributeValues = {
      ":pk": pk,
    };

    let KeyConditionExpression = "#pk = :pk";

    if (skEq != null) {
      ExpressionAttributeNames["#sk"] = "sk";
      ExpressionAttributeValues[":sk"] = skEq;
      KeyConditionExpression += " AND #sk = :sk";
    } else if (beginsWithSk != null) {
      ExpressionAttributeNames["#sk"] = "sk";
      ExpressionAttributeValues[":skpref"] = beginsWithSk;
      KeyConditionExpression += " AND begins_with(#sk, :skpref)";
    }

    // paginado
    let Items = [];
    let ExclusiveStartKey = undefined;

    do {
      const resp = await this.ddb.send(
        new QueryCommand({
          TableName: this._table(),
          KeyConditionExpression,
          ExpressionAttributeNames,
          ExpressionAttributeValues,
          ExclusiveStartKey,
          ...(limit ? { Limit: limit } : {}),
        })
      );

      Items.push(...(resp.Items ?? []));
      ExclusiveStartKey = resp.LastEvaluatedKey;
    } while (ExclusiveStartKey && !limit);

    return { Items };
  }

  async update({ Key, Patch }) {
    // DynamoDB NO permite actualizar pk/sk, así que los sacamos por seguridad
    if (Patch?.pk) delete Patch.pk;
    if (Patch?.sk) delete Patch.sk;

    const built = buildUpdateExpression(Patch);
    if (!built) return { Attributes: undefined };

    const resp = await this.ddb.send(
      new UpdateCommand({
        TableName: this._table(),
        Key,
        ...built,
        ReturnValues: "ALL_NEW",
      })
    );



    return { Attributes: resp.Attributes };
  }
}
