import { db } from "../db/db.mjs";

const TABLE = process.env.DDB_TABLE_USERS ?? "eugenio-users";
const EMAIL_INDEX = process.env.DDB_USERS_EMAIL_INDEX ?? "EmailIndex";

function normEmail(email) {
    return String(email ?? "").trim().toLowerCase();
}
function normDni(dni) {
    return String(dni ?? "").trim();
}
function normUserId(userId) {
    return String(userId ?? "").trim();
}

function sanitizeUser(item) {
    if (!item) return null;
    return {
        id: item.userId ?? null,   // compat (tu API anterior)
        dni: item.dni,
        nombres: item.nombres,
        apellidos: item.apellidos,
        direccion: item.direccion,
        telefono: item.telefono,
        email: item.email,
        rol: item.rol,
    };
}

export class UserService {
    // --------- Lookups internos ---------
    async _getByDni(dni) {
        const _dni = normDni(dni);
        if (!_dni) return null;

        const { Item } = await db.get({
            TableName: TABLE,
            Key: { dni: _dni },
        });

        return Item ?? null;
    }

    async _getByEmail(email) {
        const _email = normEmail(email);
        if (!_email) return null;

        // Si tienes queryRaw + EmailIndex, úsalo
        if (typeof db.queryRaw === "function" && EMAIL_INDEX) {
            const { Items } = await db.queryRaw({
                TableName: TABLE,
                IndexName: EMAIL_INDEX,
                KeyConditionExpression: "#e = :e",
                ExpressionAttributeNames: { "#e": "email" },
                ExpressionAttributeValues: { ":e": _email },
                Limit: 1,
            });
            return Items?.[0] ?? null;
        }

        // Fallback: Scan (funciona siempre)
        const { Items } = await db.scan({ TableName: TABLE });
        return (Items ?? []).find((u) => normEmail(u.email) === _email) ?? null;
    }

    async _getByUserId(userId) {
        const _uid = normUserId(userId);
        if (!_uid) return null;

        // No hay índice por userId -> Scan
        const { Items } = await db.scan({ TableName: TABLE });
        return (Items ?? []).find((u) => String(u.userId ?? "") === _uid) ?? null;
    }

    // --------- API pública ---------
    async findByEmail(email) {
        return sanitizeUser(await this._getByEmail(email));
    }

    async findByEmailAndRole(email, rol) {
        const _rol = String(rol ?? "").trim();
        if (!_rol) return null;

        const item = await this._getByEmail(email);
        if (!item) return null;

        return item.rol === _rol ? sanitizeUser(item) : null;
    }

    async findByDni(dni) {
        return sanitizeUser(await this._getByDni(dni));
    }

    // compat: aquí id = userId (sub). Será scan.
    async getById(id) {
        return sanitizeUser(await this._getByUserId(id));
    }

    async addUser(data) {
        data = data ?? {};

        // mantengo tu contrato: userId requerido (sub Cognito)
        const required = ["dni", "nombres", "apellidos", "direccion", "telefono", "email", "userId"];
        for (const k of required) {
            const v = String(data[k] ?? "").trim();
            if (!v) throw new Error(`Falta el campo: ${k}`);
            data[k] = v;
        }

        const dni = normDni(data.dni);
        const email = normEmail(data.email);
        const userId = normUserId(data.userId);

        if (!data.rol) data.rol = "cliente";

        // Evitar email duplicado (no atómico, pero funcional)
        const existsEmail = await this._getByEmail(email);
        if (existsEmail) throw new Error("El correo ya está registrado");

        const Item = {
            dni,                // PK real
            userId,             // sub Cognito guardado como atributo
            nombres: data.nombres.trim(),
            apellidos: data.apellidos.trim(),
            direccion: data.direccion.trim(),
            telefono: data.telefono.trim(),
            email,
            rol: String(data.rol).trim(),
            status: data.status ?? "PENDING_CONFIRMATION",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Unicidad fuerte por DNI (PK)
        try {
            await db.put({ TableName: TABLE, Item, IfNotExists: "dni" });
        } catch (e) {
            if (String(e.message).includes("ConditionalCheckFailed")) {
                throw new Error("El DNI ya está registrado");
            }
            throw e;
        }

        return sanitizeUser(Item);
    }

    async updateUser(id, patch) {
        patch = patch ?? {};

        // id = userId (sub) => buscar por scan
        const current = await this._getByUserId(id);
        if (!current) throw new Error("Usuario no encontrado");

        // DNI es PK, no se puede cambiar con update
        if (patch.dni && normDni(patch.dni) !== normDni(current.dni)) {
            throw new Error("No se puede cambiar el DNI (es la PK).");
        }

        const updates = {};

        if (patch.email != null) {
            const nextEmail = normEmail(patch.email);
            if (!nextEmail) throw new Error("email inválido");

            if (nextEmail !== normEmail(current.email)) {
                const exists = await this._getByEmail(nextEmail);
                if (exists && normDni(exists.dni) !== normDni(current.dni)) {
                    throw new Error("El correo ya está registrado");
                }
            }
            updates.email = nextEmail;
        }

        if (patch.nombres != null) {
            const v = String(patch.nombres).trim();
            if (!v) throw new Error("nombres inválido");
            updates.nombres = v;
        }
        if (patch.apellidos != null) {
            const v = String(patch.apellidos).trim();
            if (!v) throw new Error("apellidos inválido");
            updates.apellidos = v;
        }
        if (patch.direccion != null) updates.direccion = String(patch.direccion).trim();
        if (patch.telefono != null) updates.telefono = String(patch.telefono).trim();
        if (patch.rol != null) updates.rol = String(patch.rol).trim();
        if (patch.status != null) updates.status = String(patch.status).trim();

        if (Object.keys(updates).length === 0) return sanitizeUser(current);

        updates.updatedAt = new Date().toISOString();

        const { Attributes } = await db.update({
            TableName: TABLE,
            Key: { dni: current.dni },
            Patch: updates,
        });

        return sanitizeUser(Attributes);
    }

    async getByRole(rol) {
        const _rol = String(rol ?? "").trim();
        if (!_rol) return [];

        const { Items } = await db.scan({ TableName: TABLE });
        return (Items ?? [])
            .filter((u) => String(u.rol ?? "") === _rol)
            .map(sanitizeUser);
    }

    async removeByRole(rol) {
        const users = await this.getByRole(rol);
        for (const u of users) {
            await db.delete({ TableName: TABLE, Key: { dni: u.dni } }).catch(() => { });
        }
    }

    async removeByIdAndRole(id, rol) {
        const _rol = String(rol ?? "").trim();
        if (!_rol) return false;

        const current = await this._getByUserId(id);
        if (!current) return false;
        if (String(current.rol ?? "") !== _rol) return false;

        await db.delete({ TableName: TABLE, Key: { dni: current.dni } }).catch(() => { });
        return true;
    }
}

export const userService = new UserService();
