const mongoose = require("mongoose");

/**
 * Repartidor: el usuario que usa la app móvil.
 * Contiene lo que hoy está hardcodeado en PerfilScreen.js y en el header
 * de PedidosDisponiblesScreen.js (nombre, zona, estado en línea, etc.)
 */
const repartidorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    correo: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    telefono: { type: String, trim: true },
    vehiculo: {
      tipo: { type: String, default: "Motocicleta" },
      patente: { type: String, trim: true },
    },
    calificacion: { type: Number, default: 5, min: 0, max: 5 },
    entregasCompletadas: { type: Number, default: 0 },
    documentosAlDia: { type: Boolean, default: true },
    notificacionesActivas: { type: Boolean, default: true },
    zona: { type: String, default: "Sin definir" },
    enLinea: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Repartidor", repartidorSchema);
