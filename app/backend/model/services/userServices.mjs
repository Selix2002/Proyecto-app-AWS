// src/services/userService.mjs
import { Usuario } from "../schema/usuario.mjs";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// Helper para encriptar contraseñas
async function hashPassword(plainPassword) {
    const plain = String(plainPassword ?? "").trim();
    if (!plain) {
        throw new Error("La contraseña no puede estar vacía");
    }
    return bcrypt.hash(plain, SALT_ROUNDS);
}

export class UserService {
    // findByEmail(email)
    async findByEmail(email) {
        const _email = String(email ?? "").trim().toLowerCase();
        if (!_email) return null;
        return Usuario.findOne({ email: _email }).exec();
    }

    // findByEmailAndRole(email, rol)
    async findByEmailAndRole(email, rol) {
        const _email = String(email ?? "").trim().toLowerCase();
        const _rol = String(rol ?? "").trim();
        if (!_email || !_rol) return null;
        return Usuario.findOne({ email: _email, rol: _rol }).exec();
    }

    async findByDni(dni) {
        const _dni = String(dni ?? "").trim();
        if (!_dni) return null;
        return Usuario.findOne({ dni: _dni }).exec();
    }

    async getById(id) {
        if (!id) return null;
        return Usuario.findById(id).exec();
    }

    // addUser(data)
    async addUser(data) {
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
            if (!v) {
                throw new Error(`Falta el campo: ${k}`);
            }
            data[k] = v;
        }

        data.email = data.email.toLowerCase();

        const existsEmail = await this.findByEmail(data.email);
        if (existsEmail) throw new Error("El correo ya está registrado");

        const existsDni = await this.findByDni(data.dni);
        if (existsDni) throw new Error("El DNI ya está registrado");

        // rol por defecto cliente
        if (!data.rol) data.rol = "cliente";

        // Encriptar contraseña antes de crear el usuario
        data.password = await hashPassword(data.password);
        const user = await Usuario.create(data);
        return user;
    }

    // validate(email, password, rol)
    async validate(email, password, rol) {
        const _email = String(email ?? "").trim().toLowerCase();
        const _password = String(password ?? "").trim();
        const _rol = rol != null ? String(rol).trim() : null;

        if (!_email || !_password) return null;

        // Permite login por email solo, o email+rol si lo usas en el front
        let user = null;
        if (_rol) {
            user = await this.findByEmailAndRole(_email, _rol);
        } else {
            user = await this.findByEmail(_email);
        }

        if (!user) return null;

        // 👉 checkPassword ahora es asíncrono y usa bcrypt.compare
        const ok = await user.checkPassword(_password);
        if (!ok) {
            console.log("Password incorrecto para", _email);
            return null;
        }

        return user; // el controlador se encargará de generar el JWT con user.id
    }

    async updateUser(id, patch) {
        const user = await this.getById(id);
        if (!user) throw new Error("Usuario no encontrado");

        const updates = { ...patch };

        if (updates.email != null) {
            updates.email = String(updates.email).trim().toLowerCase();
        }
        if (updates.dni != null) {
            updates.dni = String(updates.dni).trim();
        }
        if (updates.nombres != null) {
            updates.nombres = String(updates.nombres).trim();
        }
        if (updates.apellidos != null) {
            updates.apellidos = String(updates.apellidos).trim();
        }
        if (updates.direccion != null) {
            updates.direccion = String(updates.direccion).trim();
        }
        if (updates.telefono != null) {
            updates.telefono = String(updates.telefono).trim();
        }

        // email duplicado
        if (updates.email && updates.email !== user.email) {
            const dup = await this.findByEmail(updates.email);
            if (dup && String(dup._id) !== String(user._id)) {
                throw new Error("El correo ya está registrado");
            }
        }

        // dni duplicado
        if (updates.dni && updates.dni !== user.dni) {
            const dup = await this.findByDni(updates.dni);
            if (dup && String(dup._id) !== String(user._id)) {
                throw new Error("El DNI ya está registrado");
            }
        }

        // Se encripta la nueva contraseña si se proporciona
        if (updates.password != null) {
            const newPass = String(updates.password).trim();
            if (newPass) {
                updates.password = await hashPassword(newPass);
            } else {
                // si viene vacía, mejor no tocar la contraseña
                delete updates.password;
            }
        }

        Object.assign(user, updates);
        const saved = await user.save();

        const obj = saved.toObject();
        delete obj.password;
        return obj;
    }
}

export const userService = new UserService();
