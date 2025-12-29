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

function buildIfNotExistsCondition(ifNotExists) {
  // Backward compatible:
  // - true  => attribute_not_exists(pk) AND attribute_not_exists(sk) (single-table old)
  // - "bookId" => attribute_not_exists(bookId)
  // - ["bookId","sk"] => attribute_not_exists(bookId) AND attribute_not_exists(sk)
  if (!ifNotExists) return null;

  if (ifNotExists === true) {
    return {
      ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
    };
  }

  const keys = Array.isArray(ifNotExists) ? ifNotExists : [ifNotExists];
  const names = {};
  const parts = [];
  let i = 0;

  for (const k of keys) {
    i += 1;
    const nk = `#k${i}`;
    names[nk] = k;
    parts.push(`attribute_not_exists(${nk})`);
  }

  return {
    ConditionExpression: parts.join(" AND "),
    ExpressionAttributeNames: names,
  };
}

export class DynamoAWS {
  constructor({ tableName, region } = {}) {
    const client = new DynamoDBClient({
      region: region ?? process.env.AWS_REGION ?? "us-east-1",
    });

    this.ddb = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });

    // tableName ahora es opcional (por compatibilidad)
    this.tableName = tableName ?? null;
  }

  _table(TableName) {
    const t = TableName ?? this.tableName;
    if (!t) throw new Error("Falta TableName (multi-tabla). Pasa TableName en cada operación o define tableName por defecto.");
    return t;
  }

  createTable() {
    // no-op
  }

  async put({ TableName, Item, IfNotExists = false } = {}) {
    const built = buildIfNotExistsCondition(IfNotExists);

    await this.ddb.send(
      new PutCommand({
        TableName: this._table(TableName),
        Item,
        ...(built ? built : {}),
      })
    );

    return {};
  }

  async get({ TableName, Key } = {}) {
    const resp = await this.ddb.send(
      new GetCommand({
        TableName: this._table(TableName),
        Key,
      })
    );
    return { Item: resp.Item };
  }

  async delete({ TableName, Key } = {}) {
    await this.ddb.send(
      new DeleteCommand({
        TableName: this._table(TableName),
        Key,
      })
    );
    return {};
  }

  async scan({ TableName, Limit } = {}) {
    let Items = [];
    let ExclusiveStartKey = undefined;

    do {
      const resp = await this.ddb.send(
        new ScanCommand({
          TableName: this._table(TableName),
          ExclusiveStartKey,
          ...(Limit ? { Limit: Limit } : {}),
        })
      );

      Items.push(...(resp.Items ?? []));
      ExclusiveStartKey = resp.LastEvaluatedKey;

      if (Limit && Items.length >= Limit) break;
    } while (ExclusiveStartKey);

    return { Items };
  }

  // Query genérico (para GSIs también)
  async queryRaw({
    TableName,
    IndexName,
    KeyConditionExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    Limit,
  } = {}) {
    if (!KeyConditionExpression) throw new Error("queryRaw requiere KeyConditionExpression");

    let Items = [];
    let ExclusiveStartKey = undefined;

    do {
      const resp = await this.ddb.send(
        new QueryCommand({
          TableName: this._table(TableName),
          ...(IndexName ? { IndexName } : {}),
          KeyConditionExpression,
          ExpressionAttributeNames,
          ExpressionAttributeValues,
          ExclusiveStartKey,
          ...(Limit ? { Limit: Limit } : {}),
        })
      );

      Items.push(...(resp.Items ?? []));
      ExclusiveStartKey = resp.LastEvaluatedKey;

      if (Limit) break;
    } while (ExclusiveStartKey);

    return { Items };
  }

  // Compat: tu query pk/sk antigua (single-table)
  async query({ TableName, pk, beginsWithSk, skEq, limit } = {}) {
    if (!pk) throw new Error("query requiere pk");

    const ExpressionAttributeNames = { "#pk": "pk" };
    const ExpressionAttributeValues = { ":pk": pk };

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

    return this.queryRaw({
      TableName,
      KeyConditionExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      Limit: limit,
    });
  }

  async update({ TableName, Key, Patch } = {}) {
    // Protege claves: no permitas actualizar atributos que son parte del Key
    if (Key && Patch) {
      for (const k of Object.keys(Key)) {
        if (k in Patch) delete Patch[k];
      }
    }

    const built = buildUpdateExpression(Patch);
    if (!built) return { Attributes: undefined };

    const resp = await this.ddb.send(
      new UpdateCommand({
        TableName: this._table(TableName),
        Key,
        ...built,
        ReturnValues: "ALL_NEW",
      })
    );

    return { Attributes: resp.Attributes };
  }
}
