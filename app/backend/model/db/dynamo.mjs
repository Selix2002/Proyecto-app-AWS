import fs from "node:fs";
import path from "node:path";

function keyOf(Key) {
    const pk = Key.pk ?? Key.PK ?? Key.partitionKey ?? Key.id;
    const sk = Key.sk ?? Key.SK ?? Key.sortKey ?? "__nosk__";
    return `${pk}||${sk}`;
}

export class Dynamo {
    constructor({ persistFile = null } = {}) {
        this.tables = new Map();
        this.persistFile = persistFile ? path.resolve(persistFile) : null;

        if (this.persistFile && fs.existsSync(this.persistFile)) {
            const raw = JSON.parse(fs.readFileSync(this.persistFile, "utf-8"));
            for (const [tableName, entries] of Object.entries(raw)) {
                this.tables.set(tableName, new Map(entries));
            }
        }
    }

    // ✅ ahora: si no existe, FALLA
    _table(name) {
        const t = this.tables.get(name);
        if (!t) {
            throw new Error(`[Dynamo] Table '${name}' does not exist. Create it first.`);
        }
        return t;
    }

    // ✅ ahora: método explícito para "crear tabla"
    createTable(name) {
        if (!name) throw new Error("createTable requiere name");
        if (this.tables.has(name)) return; // o throw si prefieres
        this.tables.set(name, new Map());
        this._save();
    }

    listTables() {
        return Array.from(this.tables.keys());
    }

    _save() {
        if (!this.persistFile) return;
        const obj = {};
        for (const [name, map] of this.tables.entries()) {
            obj[name] = Array.from(map.entries());
        }
        fs.writeFileSync(this.persistFile, JSON.stringify(obj, null, 2), "utf-8");
    }

    async put({ TableName, Item, IfNotExists = false }) {
        if (!TableName || !Item) throw new Error("put requiere TableName e Item");
        const table = this._table(TableName);

        if (!Item.pk && !Item.PK && !Item.id) {
            throw new Error("Item necesita pk (o id) para simular Dynamo");
        }

        const composite = keyOf({ pk: Item.pk ?? Item.PK ?? Item.id, sk: Item.sk ?? Item.SK });

        // ✅ opción útil: simular unicidad (tipo ConditionExpression)
        if (IfNotExists && table.has(composite)) {
            throw new Error(`[Dynamo] ConditionalCheckFailed: item already exists (${composite})`);
        }

        table.set(composite, structuredClone(Item));
        this._save();
        return {};
    }

    async get({ TableName, Key }) {
        const table = this._table(TableName);
        const composite = keyOf(Key ?? {});
        const Item = table.get(composite);
        return { Item: Item ? structuredClone(Item) : undefined };
    }

    async delete({ TableName, Key }) {
        const table = this._table(TableName);
        const composite = keyOf(Key ?? {});
        table.delete(composite);
        this._save();
        return {};
    }

    async scan({ TableName, Filter } = {}) {
        const table = this._table(TableName);
        let Items = Array.from(table.values()).map((x) => structuredClone(x));
        if (typeof Filter === "function") Items = Items.filter(Filter);
        return { Items };
    }

    async query({ TableName, pk, beginsWithSk } = {}) {
        const table = this._table(TableName);
        const Items = [];
        for (const item of table.values()) {
            const ipk = item.pk ?? item.PK ?? item.id;
            const isk = item.sk ?? item.SK ?? "__nosk__";
            if (pk != null && ipk !== pk) continue;
            if (beginsWithSk != null && !String(isk).startsWith(String(beginsWithSk))) continue;
            Items.push(structuredClone(item));
        }
        return { Items };
    }

    async update({ TableName, Key, Patch }) {
        const table = this._table(TableName);
        const composite = keyOf(Key ?? {});
        const current = table.get(composite);
        if (!current) return { Attributes: undefined };

        const updated = { ...current, ...Patch };
        table.set(composite, updated);
        this._save();
        return { Attributes: structuredClone(updated) };
    }
}
