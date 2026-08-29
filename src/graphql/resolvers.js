const bcrypt = require("bcryptjs");
const { GraphQLScalarType, Kind } = require("graphql");
const Repartidor = require("../models/Repartidor");
const Pedido = require("../models/Pedido");
const { firmarToken, requireAuth } = require("../middleware/auth");

const dateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "Fecha/hora ISO 8601",
  serialize: (value) => (value instanceof Date ? value.toISOString() : value),
  parseValue: (value) => new Date(value),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});

// Orden de transición válido; evita, por ejemplo, saltar de ACEPTADO a
// ENTREGADO sin pasar por los pasos intermedios (mismo flujo que
// ActualizarEstadoScreen.js define con STEP_TITLES).
const ORDEN_ESTADOS = ["DISPONIBLE", "ACEPTADO", "LLEGADA_LOCAL", "RETIRADO", "EN_CAMINO_CLIENTE", "ENTREGADO"];
const CAMPO_HORA_POR_ESTADO = {
  ACEPTADO: "horaAceptado",
  LLEGADA_LOCAL: "horaLlegadaLocal",
  RETIRADO: "horaRetirado",
  EN_CAMINO_CLIENTE: "horaEnCaminoCliente",
  ENTREGADO: "horaEntregado",
};

function hoyRango(fechaStr) {
  const base = fechaStr ? new Date(fechaStr) : new Date();
  const inicio = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio, fin };
}

const resolvers = {
  DateTime: dateTimeScalar,

  Pedido: {
    id: (p) => p._id.toString(),
    repartidor: (p) => (p.repartidor ? Repartidor.findById(p.repartidor) : null),
  },
  Repartidor: {
    id: (r) => r._id.toString(),
  },

  Query: {
    pedidosDisponibles: async () => {
      return Pedido.find({ estado: "DISPONIBLE" }).sort({ createdAt: -1 });
    },

    pedidosEnCurso: async (_parent, _args, { repartidor }) => {
      requireAuth(repartidor);
      return Pedido.find({
        repartidor: repartidor._id,
        estado: { $in: ["ACEPTADO", "LLEGADA_LOCAL", "RETIRADO", "EN_CAMINO_CLIENTE"] },
      }).sort({ horaAceptado: -1 });
    },

    historialPedidos: async (_parent, { dias }, { repartidor }) => {
      requireAuth(repartidor);
      const desde = new Date();
      desde.setDate(desde.getDate() - dias);
      return Pedido.find({
        repartidor: repartidor._id,
        estado: "ENTREGADO",
        horaEntregado: { $gte: desde },
      }).sort({ horaEntregado: -1 });
    },

    resumenGanancias: async (_parent, { fecha }, { repartidor }) => {
      requireAuth(repartidor);
      const { inicio, fin } = hoyRango(fecha);
      const pedidos = await Pedido.find({
        repartidor: repartidor._id,
        estado: "ENTREGADO",
        horaEntregado: { $gte: inicio, $lt: fin },
      });
      return {
        fecha: inicio.toISOString().slice(0, 10),
        totalGanado: pedidos.reduce((acc, p) => acc + p.pago, 0),
        totalPropinas: pedidos.reduce((acc, p) => acc + (p.propina || 0), 0),
        entregasCompletadas: pedidos.length,
      };
    },

    pedido: async (_parent, { id }) => Pedido.findById(id),

    yo: (_parent, _args, { repartidor }) => repartidor,
  },

  Mutation: {
    login: async (_parent, { correo, password }) => {
      const repartidor = await Repartidor.findOne({ correo: correo.toLowerCase().trim() });
      if (!repartidor) throw new Error("Correo o contraseña incorrectos.");

      const ok = await bcrypt.compare(password, repartidor.passwordHash);
      if (!ok) throw new Error("Correo o contraseña incorrectos.");

      return { token: firmarToken(repartidor), repartidor };
    },

    setEnLinea: async (_parent, { enLinea }, { repartidor }) => {
      requireAuth(repartidor);
      repartidor.enLinea = enLinea;
      await repartidor.save();
      return repartidor;
    },

    aceptarPedido: async (_parent, { pedidoId }, { repartidor }) => {
      requireAuth(repartidor);
      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) throw new Error("Pedido no encontrado.");
      if (pedido.estado !== "DISPONIBLE") throw new Error("Este pedido ya no está disponible.");

      pedido.repartidor = repartidor._id;
      pedido.estado = "ACEPTADO";
      pedido.horaAceptado = new Date();
      // Código de 4 dígitos que el cliente mostrará para validar la entrega
      // (mismo patrón visual que ConfirmarEntregaScreen.js, ej "4729")
      pedido.codigoConfirmacion = String(Math.floor(1000 + Math.random() * 9000));
      await pedido.save();
      return pedido;
    },

    avanzarEstadoPedido: async (_parent, { pedidoId, estado }, { repartidor }) => {
      requireAuth(repartidor);
      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) throw new Error("Pedido no encontrado.");
      if (String(pedido.repartidor) !== String(repartidor._id)) {
        throw new Error("Este pedido no pertenece al repartidor autenticado.");
      }

      const actualIdx = ORDEN_ESTADOS.indexOf(pedido.estado);
      const nuevoIdx = ORDEN_ESTADOS.indexOf(estado);
      if (nuevoIdx !== actualIdx + 1) {
        throw new Error(`Transición inválida: no se puede pasar de ${pedido.estado} a ${estado}.`);
      }
      if (estado === "ENTREGADO") {
        throw new Error("Usa la mutation confirmarEntrega para el paso final.");
      }

      pedido.estado = estado;
      pedido[CAMPO_HORA_POR_ESTADO[estado]] = new Date();
      await pedido.save();
      return pedido;
    },

    confirmarEntrega: async (_parent, { pedidoId, codigo, fotoComprobanteUrl, nota }, { repartidor }) => {
      requireAuth(repartidor);
      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) throw new Error("Pedido no encontrado.");
      if (String(pedido.repartidor) !== String(repartidor._id)) {
        throw new Error("Este pedido no pertenece al repartidor autenticado.");
      }
      if (pedido.estado !== "EN_CAMINO_CLIENTE") {
        throw new Error("El pedido debe estar 'en camino al cliente' antes de confirmar la entrega.");
      }
      if (codigo !== pedido.codigoConfirmacion) {
        throw new Error("Código de confirmación incorrecto.");
      }

      pedido.estado = "ENTREGADO";
      pedido.horaEntregado = new Date();
      if (fotoComprobanteUrl) pedido.fotoComprobanteUrl = fotoComprobanteUrl;
      if (nota) pedido.notaEntrega = nota;
      await pedido.save();

      repartidor.entregasCompletadas += 1;
      await repartidor.save();

      return pedido;
    },
  },
};

module.exports = resolvers;
