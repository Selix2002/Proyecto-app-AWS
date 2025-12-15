// src/model/carro.mjs
import mongoose from "mongoose";

const { Schema } = mongoose;

// Subdocumento para los ítems del carrito (no es un modelo aparte)
const cartItemSchema = new Schema(
  {
    // Referencia al documento Libro en Mongo
    libro: {
      type: Schema.Types.ObjectId,
      ref: "Libro",
      required: true,
    },

    // Para compatibilidad con tu modelo actual, puedes guardar también
    // el id lógico que usa tu app (por ejemplo Libro.id o Libro._id antiguo).
    libroId: {
      type: String,
      required: true,
    },

    titulo: {
      type: String,
      required: true,
      trim: true,
    },

    precio: {
      type: Number,
      required: true,
      min: 0,
    },

    cantidad: {
      type: Number,
      required: true,
      min: 1,
    },

    // Stock disponible al momento (como en tu CartStore)
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false, // no necesitamos un _id propio por cada item
  }
);

const carroSchema = new Schema(
  {
    // Un carrito está asociado a UN usuario
    usuario: {
      type: Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      unique: true, // un carro por usuario, como tu Map actual
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },

    // Tasa de IVA para libros (equivalente a this.IVA_LIBROS)
    ivaRate: {
      type: Number,
      default: 0.04,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ---- Virtuales que imitan CartStore.get ----

// subtotal = sumatorio de (precio * cantidad)
carroSchema.virtual("subtotal").get(function () {
  if (!this.items || this.items.length === 0) return 0;
  return this.items.reduce((sum, it) => sum + it.precio * it.cantidad, 0);
});

carroSchema.virtual("iva").get(function () {
  return this.subtotal * this.ivaRate;
});

carroSchema.virtual("total").get(function () {
  return this.subtotal + this.iva;
});

// Opcional: virtual 'id' para usar .id en vez de _id
carroSchema.virtual("id").get(function () {
  return this._id.toString();
});

export const Carro = mongoose.model("Carro", carroSchema);
