const gql = require("graphql-tag");

const typeDefs = gql`
  scalar DateTime

  enum EstadoPedido {
    DISPONIBLE
    ACEPTADO
    LLEGADA_LOCAL
    RETIRADO
    EN_CAMINO_CLIENTE
    ENTREGADO
    CANCELADO
  }

  type Vehiculo {
    tipo: String
    patente: String
  }

  type Repartidor {
    id: ID!
    nombre: String!
    correo: String!
    telefono: String
    vehiculo: Vehiculo
    calificacion: Float
    entregasCompletadas: Int
    documentosAlDia: Boolean
    notificacionesActivas: Boolean
    zona: String
    enLinea: Boolean
  }

  type Local {
    nombre: String!
    direccion: String!
  }

  type Cliente {
    nombre: String!
    direccion: String!
    telefono: String
  }

  type Pedido {
    id: ID!
    numero: String!
    local: Local!
    cliente: Cliente!
    repartidor: Repartidor
    estado: EstadoPedido!
    distanciaKm: Float
    tiempoEstimadoMin: Int
    pago: Float!
    propina: Float
    codigoConfirmacion: String
    fotoComprobanteUrl: String
    notaEntrega: String
    horaAceptado: DateTime
    horaLlegadaLocal: DateTime
    horaRetirado: DateTime
    horaEnCaminoCliente: DateTime
    horaEntregado: DateTime
    createdAt: DateTime
  }

  # Totales del día para el header de PedidosDisponiblesScreen y el resumen
  # de HistorialDePedidosScreen ("GANANCIAS DEL DÍA", "HOY $21.300", etc.)
  type ResumenGanancias {
    fecha: String!
    totalGanado: Float!
    totalPropinas: Float!
    entregasCompletadas: Int!
  }

  type AuthPayload {
    token: String!
    repartidor: Repartidor!
  }

  type Query {
    "Pedido \`Main\`: pedidos que cualquier repartidor en línea puede tomar."
    pedidosDisponibles: [Pedido!]!

    "Pedido \`PedidosEnCurso\` / tab Pedidos: los que el repartidor autenticado ya aceptó y no ha entregado."
    pedidosEnCurso: [Pedido!]!

    "Pantalla Historial: pedidos ENTREGADO del repartidor autenticado."
    historialPedidos(dias: Int = 7): [Pedido!]!

    resumenGanancias(fecha: String): ResumenGanancias!

    pedido(id: ID!): Pedido

    "Pantalla Perfil."
    yo: Repartidor
  }

  type Mutation {
    login(correo: String!, password: String!): AuthPayload!

    "Toggle 'En línea' / 'Fuera de línea' en PedidosDisponiblesScreen."
    setEnLinea(enLinea: Boolean!): Repartidor!

    "DetalleDelPedidoScreen -> botón 'Aceptar pedido'."
    aceptarPedido(pedidoId: ID!): Pedido!

    "ActualizarEstadoScreen -> cada botón 'Marcar ...' avanza un estado."
    avanzarEstadoPedido(pedidoId: ID!, estado: EstadoPedido!): Pedido!

    "ConfirmarEntregaScreen -> valida código + guarda foto/nota y cierra el pedido."
    confirmarEntrega(pedidoId: ID!, codigo: String!, fotoComprobanteUrl: String, nota: String): Pedido!
  }
`;

module.exports = typeDefs;
