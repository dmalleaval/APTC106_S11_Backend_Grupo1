const mongoose = require("mongoose");

/**
 * Estados del pedido — calcan uno a uno los pasos de
 * src/screens/ActualizarEstadoScreen.js (STEP_TITLES) más un estado inicial
 * DISPONIBLE, antes de que algún repartidor lo acepte.
 */
const ESTADOS = [
  "DISPONIBLE",
  "ACEPTADO",
  "LLEGADA_LOCAL",
  "RETIRADO",
  "EN_CAMINO_CLIENTE",
  "ENTREGADO",
  "CANCELADO",
];

const pedidoSchema = new mongoose.Schema(
  {
    // Identificador legible que ya usa la UI, ej: "#1042"
    numero: { type: String, required: true, unique: true },

    local: {
      nombre: { type: String, required: true },
      direccion: { type: String, required: true },
    },

    // El cliente vive hoy en la plataforma web Django (fuera del alcance de
    // este backend). Para este MVP se embebe la info mínima que la app del
    // repartidor necesita mostrar; la integración real con Django queda
    // como trabajo futuro (ver informe, sección de conclusiones).
    cliente: {
      nombre: { type: String, required: true },
      direccion: { type: String, required: true },
      telefono: { type: String },
    },

    repartidor: { type: mongoose.Schema.Types.ObjectId, ref: "Repartidor", default: null },

    estado: { type: String, enum: ESTADOS, default: "DISPONIBLE" },

    distanciaKm: { type: Number },
    tiempoEstimadoMin: { type: Number },
    pago: { type: Number, required: true }, // lo que gana el repartidor por el reparto
    propina: { type: Number, default: 0 },

    codigoConfirmacion: { type: String }, // ej "4729", se valida en ConfirmarEntregaScreen
    fotoComprobanteUrl: { type: String, default: null },
    notaEntrega: { type: String, default: "" },

    // Timestamps de cada transición — alimentan la barra de progreso de
    // ActualizarEstadoScreen.js (hoy simulados con formatNow() en el cliente)
    horaAceptado: { type: Date },
    horaLlegadaLocal: { type: Date },
    horaRetirado: { type: Date },
    horaEnCaminoCliente: { type: Date },
    horaEntregado: { type: Date },
  },
  { timestamps: true }
);

pedidoSchema.statics.ESTADOS = ESTADOS;

module.exports = mongoose.model("Pedido", pedidoSchema);
