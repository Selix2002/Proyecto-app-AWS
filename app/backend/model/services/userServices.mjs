// src/model/services/userServices.mjs
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { db } from "../db/db.mjs";

const TABLE = "Users";
const SALT_ROUNDS = 10;

const SK_PROFILE = "PROFILE#";

function userKey(userId) {
    return { pk: `USER#${userId}`, sk: SK_PROFILE };
}

function emailPk(email) {
    return `EMAIL#${String(email ?? "").trim().toLowerCase()}`;
}

function dniPk(dni) {
    return `DNI#${String(dni ?? "").trim()}`;
}

function sanitizeUser(item) {
    if (!item) return null;
    return {
        id: item.userId,
        dni: item.dni,
        nombres: item.nombres,
        apellidos: item.apellidos,
        direccion: item.direccion,
        telefono: item.telefono,
        email: item.email,
        rol: item.rol,
    };
}

async function hashPassword(plainPassword) {
    const plain = String(plainPassword ?? "").trim();
    if (!plain) throw new Error("La contraseña no puede estar vacía");
    return bcrypt.hash(plain, SALT_ROUNDS);
}

export class UserService {
    // ---- helpers internos (índices) ----
    async _getUserIdByEmail(email) {
        const pk = emailPk(email);
        if (!pk || pk === "EMAIL#") return null;

        const { Items } = await db.query({
            TableName: TABLE,
            pk,
            beginsWithSk: "USER#",
        });

        const ref = Items?.[0];
        return ref?.userId ?? null;
    }

    async _getUserIdByDni(dni) {
        const pk = dniPk(dni);
        if (!pk || pk === "DNI#") return null;

        const { Items } = await db.query({
            TableName: TABLE,
            pk,
            beginsWithSk: "USER#",
        });

        const ref = Items?.[0];
        return ref?.userId ?? null;
    }

    // ---- API pública igual que antes ----

    async findByEmail(email) {
        const _email = String(email ?? "").trim().toLowerCase();
        if (!_email) return null;

        const userId = await this._getUserIdByEmail(_email);
        if (!userId) return null;

        const { Item } = await db.get({
            TableName: TABLE,
            Key: userKey(userId),
        });

        return Item ? sanitizeUser(Item) : null;
    }

    async findByEmailAndRole(email, rol) {
        const _email = String(email ?? "").trim().toLowerCase();
        const _rol = String(rol ?? "").trim();
        if (!_email || !_rol) return null;

        const userId = await this._getUserIdByEmail(_email);
        if (!userId) return null;

        const { Item } = await db.get({ TableName: TABLE, Key: userKey(userId) });
        if (!Item) return null;

        return Item.rol === _rol ? sanitizeUser(Item) : null;
    }

    async findByDni(dni) {
        const _dni = String(dni ?? "").trim();
        if (!_dni) return null;

        const userId = await this._getUserIdByDni(_dni);
        if (!userId) return null;

        const { Item } = await db.get({
            TableName: TABLE,
            Key: userKey(userId),
        });

        return Item ? sanitizeUser(Item) : null;
    }

    async getById(id) {
        const userId = String(id ?? "").trim();
        if (!userId) return null;

        const { Item } = await db.get({
            TableName: TABLE,
            Key: userKey(userId),
        });

        return Item ? sanitizeUser(Item) : null;
    }

    async addUser(data) {
        data = data ?? {};

        const required = [
            "dni",
            "nombres",
            "apellidos",
            "direccion",
            "telefono",
            "email",
            "password",
        ];

        for (const k of required) {
            const v = String(data[k] ?? "").trim();
            if (!v) throw new Error(`Falta el campo: ${k}`);
            data[k] = v;
        }

        data.email = data.email.toLowerCase();

        // rol por defecto
        if (!data.rol) data.rol = "cliente";

        // unicidad: email / dni usando ítems índice
        const userId = crypto.randomUUID();
        const passwordHash = await hashPassword(data.password);

        // 1) reservar email (falla si ya existe)
        const emailRef = {
            pk: emailPk(data.email),
            sk: `USER#${userId}`,
            userId,
            email: data.email,
            rol: data.rol, // opcional
        };

        // 2) reservar dni (falla si ya existe)
        const dniRef = {
            pk: dniPk(data.dni),
            sk: `USER#${userId}`,
            userId,
            dni: data.dni,
        };

        // 3) perfil
        const profile = {
            ...userKey(userId),
            userId,
            dni: data.dni,
            nombres: data.nombres,
            apellidos: data.apellidos,
            direccion: data.direccion,
            telefono: data.telefono,
            email: data.email,
            rol: data.rol,
            passwordHash,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Best-effort rollback si algo falla
        try {
            await db.put({ TableName: TABLE, Item: emailRef, IfNotExists: true });
        } catch (e) {
            if (String(e.message).includes("ConditionalCheckFailed")) {
                throw new Error("El correo ya está registrado");
            }
            throw e;
        }

        try {
            await db.put({ TableName: TABLE, Item: dniRef, IfNotExists: true });
        } catch (e) {
            // rollback email
            await db.delete({ TableName: TABLE, Key: { pk: emailRef.pk, sk: emailRef.sk } }).catch(() => { });
            if (String(e.message).includes("ConditionalCheckFailed")) {
                throw new Error("El DNI ya está registrado");
            }
            throw e;
        }

        try {
            await db.put({ TableName: TABLE, Item: profile, IfNotExists: true });
        } catch (e) {
            // rollback dni + email
            await db.delete({ TableName: TABLE, Key: { pk: dniRef.pk, sk: dniRef.sk } }).catch(() => { });
            await db.delete({ TableName: TABLE, Key: { pk: emailRef.pk, sk: emailRef.sk } }).catch(() => { });
            throw e;
        }

        return sanitizeUser(profile);
    }

    async validate(email, password, rol) {
        const _email = String(email ?? "").trim().toLowerCase();
        const _password = String(password ?? "").trim();
        const _rol = rol != null ? String(rol).trim() : null;

        if (!_email || !_password) return null;

        const userId = await this._getUserIdByEmail(_email);
        if (!userId) return null;

        const { Item: user } = await db.get({ TableName: TABLE, Key: userKey(userId) });
        if (!user) return null;

        if (_rol && user.rol !== _rol) return null;

        const ok = await bcrypt.compare(_password, user.passwordHash ?? "");
        if (!ok) return null;

        // el controlador genera JWT con user.id
        return sanitizeUser(user);
    }

    async updateUser(id, patch) {
        const userId = String(id ?? "").trim();
        if (!userId) throw new Error("Usuario no encontrado");

        const { Item: current } = await db.get({ TableName: TABLE, Key: userKey(userId) });
        if (!current) throw new Error("Usuario no encontrado");

        patch = patch ?? {};
        const updates = { ...patch };

        // normalizaciones
        if (updates.email != null) updates.email = String(updates.email).trim().toLowerCase();
        if (updates.dni != null) updates.dni = String(updates.dni).trim();
        if (updates.nombres != null) updates.nombres = String(updates.nombres).trim();
        if (updates.apellidos != null) updates.apellidos = String(updates.apellidos).trim();
        if (updates.direccion != null) updates.direccion = String(updates.direccion).trim();
        if (updates.telefono != null) updates.telefono = String(updates.telefono).trim();

        // cambiar password si viene
        if (updates.password != null) {
            const newPass = String(updates.password).trim();
            if (newPass) updates.passwordHash = await hashPassword(newPass);
            delete updates.password;
        }

        // ✅ email duplicado: reservar nuevo emailRef antes de soltar el viejo
        if (updates.email && updates.email !== current.email) {
            const newEmailRef = {
                pk: emailPk(updates.email),
                sk: `USER#${userId}`,
                userId,
                email: updates.email,
                rol: current.rol,
            };

            try {
                await db.put({ TableName: TABLE, Item: newEmailRef, IfNotExists: true });
            } catch (e) {
                if (String(e.message).includes("ConditionalCheckFailed")) {
                    throw new Error("El correo ya está registrado");
                }
                throw e;
            }

            // borrar ref viejo (best-effort)
            const oldPk = emailPk(current.email);
            await db.delete({ TableName: TABLE, Key: { pk: oldPk, sk: `USER#${userId}` } }).catch(() => { });
        }

        // ✅ dni duplicado
        if (updates.dni && updates.dni !== current.dni) {
            const newDniRef = {
                pk: dniPk(updates.dni),
                sk: `USER#${userId}`,
                userId,
                dni: updates.dni,
            };

            try {
                await db.put({ TableName: TABLE, Item: newDniRef, IfNotExists: true });
            } catch (e) {
                if (String(e.message).includes("ConditionalCheckFailed")) {
                    throw new Error("El DNI ya está registrado");
                }
                throw e;
            }

            const oldPk = dniPk(current.dni);
            await db.delete({ TableName: TABLE, Key: { pk: oldPk, sk: `USER#${userId}` } }).catch(() => { });
        }

        const next = {
            ...current,
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        const { Attributes } = await db.update({
            TableName: TABLE,
            Key: userKey(userId),
            Patch: next,
        });

        return sanitizeUser(Attributes);
    }
    // ✅ listar usuarios por rol (para getUsersByRole)
    async getByRole(rol) {
        const _rol = String(rol ?? "").trim();
        if (!_rol) return [];

        const { Items } = await db.scan({
            TableName: TABLE,
            Filter: (it) => (it.sk === "PROFILE#" && it.rol === _rol),
        });

        return (Items ?? []).map(sanitizeUser);
    }

    // ✅ eliminar usuarios por rol (para removeUsersByRole)
    // borra: PROFILE + EMAIL# + DNI#
    async removeByRole(rol) {
        const users = await this.getByRole(rol);

        for (const u of users) {
            const userId = String(u.id);

            await db.delete({ TableName: TABLE, Key: { pk: `USER#${userId}`, sk: "PROFILE#" } }).catch(() => { });
            await db.delete({ TableName: TABLE, Key: { pk: `EMAIL#${u.email}`, sk: `USER#${userId}` } }).catch(() => { });
            await db.delete({ TableName: TABLE, Key: { pk: `DNI#${u.dni}`, sk: `USER#${userId}` } }).catch(() => { });
        }
    }

    // ✅ eliminar un usuario por id + rol (para removeUserByIdAndRole)
    async removeByIdAndRole(id, rol) {
        const userId = String(id ?? "").trim();
        const _rol = String(rol ?? "").trim();
        if (!userId || !_rol) return false;

        const u = await this.getById(userId);
        if (!u || u.rol !== _rol) return false;

        await db.delete({ TableName: TABLE, Key: { pk: `USER#${userId}`, sk: "PROFILE#" } }).catch(() => { });
        await db.delete({ TableName: TABLE, Key: { pk: `EMAIL#${u.email}`, sk: `USER#${userId}` } }).catch(() => { });
        await db.delete({ TableName: TABLE, Key: { pk: `DNI#${u.dni}`, sk: `USER#${userId}` } }).catch(() => { });

        return true;
    }

}

export const userService = new UserService();
