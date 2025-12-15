// src/model/factura.mjs
import mongoose from "mongoose";

const { Schema } = mongoose;

// Subdocumento para los ítems de la factura
const facturaItemSchema = new Schema(
    {
        libro: {
            type: Schema.Types.ObjectId,
            ref: "Libro",
        },

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

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        _id: false,
    }
);

const facturaMetaSchema = new Schema(
    {
        razonSocial: {
            type: String,
            required: true,
            trim: true,
        },
        direccion: {
            type: String,
            required: true,
            trim: true,
        },
        dni: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
    },
    {
        _id: false,
    }
);

const facturaSchema = new Schema(
    {
        usuario: {
            type: Schema.Types.ObjectId,
            ref: "Usuario",
            required: true,
            index: true,
        },

        fechaISO: {
            type: String,
            required: true,
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        iva: {
            type: Number,
            required: true,
            min: 0,
        },

        total: {
            type: Number,
            required: true,
            min: 0,
        },

        ivaRate: {
            type: Number,
            required: true,
            min: 0,
        },

        items: {
            type: [facturaItemSchema],
            default: [],
            validate: {
                validator(arr) {
                    return Array.isArray(arr) && arr.length > 0;
                },
                message: "La factura debe tener al menos un ítem",
            },
        },

        meta: {
            type: facturaMetaSchema,
            required: true,
        },
    },
    {
        timestamps: true, 
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual para usar .id en vez de _id (compatibilidad)
facturaSchema.virtual("id").get(function () {
    return this._id.toString();
});

export const Factura = mongoose.model("Factura", facturaSchema);
