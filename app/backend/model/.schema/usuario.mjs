// src/model/usuario.mjs
import mongoose from 'mongoose';
import bcrypt from 'bcrypt'; // 👈 NUEVO: para comparar contraseñas encriptadas

const Schema = mongoose.Schema;

const schema = new Schema(
  {
    dni: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    nombres: {
      type: String,
      required: true,
      trim: true,
    },
    apellidos: {
      type: String,
      required: true,
      trim: true,
    },
    direccion: {
      type: String,
      required: true,
      trim: true,
    },
    telefono: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    rol: {
      type: String,
      enum: ['cliente', 'admin'],
      default: 'cliente',
    },
    carro: {
      type: Schema.Types.ObjectId,
      ref: 'Carro',
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        // No devolver la contraseña al convertir a JSON
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

// Métodos del documento


schema.methods.checkPassword = async function (pass) {
  const plain = String(pass ?? '');
  if (!plain || !this.password) return false;

  // this.password es el HASH almacenado en Mongo
  return bcrypt.compare(plain, this.password);
};

// Propiedad virtual: nombreCompleto
schema.virtual('nombreCompleto').get(function () {
  return `${this.nombres} ${this.apellidos}`.trim();
});

// Propiedad virtual: id (string en lugar de ObjectId)
schema.virtual('id').get(function () {
  return this._id.toString();
});

export const Usuario = mongoose.model('Usuario', schema);
