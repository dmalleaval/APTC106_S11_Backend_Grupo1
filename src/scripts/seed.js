/**
 * Carga datos de ejemplo equivalentes a los mocks que hoy están hardcodeados
 * en OrdersContext.js, HistorialDePedidosScreen.js y PerfilScreen.js, para
 * poder probar la app real contra la API sin partir de una base vacía.
 *
 * Uso: npm run seed
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB } = require("../config/db");
const Repartidor = require("../models/Repartidor");
const Pedido = require("../models/Pedido");

async function seed() {
  await connectDB();

  await Promise.all([Repartidor.deleteMany({}), Pedido.deleteMany({})]);

  const passwordHash = await bcrypt.hash("12345678", 10);
  const javier = await Repartidor.create({
    nombre: "Javier Vargas",
    correo: "pedro.ortega@ejemplo.com", // mismo correo de prueba que trae LoginScreen.js
    passwordHash,
    telefono: "+56 9 1234 5678",
    vehiculo: { tipo: "Motocicleta", patente: "GTR-42" },
    calificacion: 4.9,
    entregasCompletadas: 312,
    documentosAlDia: true,
    notificacionesActivas: true,
    zona: "Providencia",
    enLinea: true,
  });

  await Pedido.create([
    {
      numero: "#1042",
      local: { nombre: "Sushi Corner", direccion: "Av. Providencia 2140" },
      cliente: { nombre: "María González", direccion: "Los Leones 1455, Depto 802" },
      estado: "DISPONIBLE",
      distanciaKm: 1.2,
      tiempoEstimadoMin: 14,
      pago: 2900,
    },
    {
      numero: "#1043",
      local: { nombre: "Pizzería Napoli", direccion: "Los Leones 1820" },
      cliente: { nombre: "Rodrigo Salas", direccion: "Manuel Montt 1520" },
      estado: "DISPONIBLE",
      distanciaKm: 2.4,
      tiempoEstimadoMin: 18,
      pago: 3200,
    },
    {
      numero: "#1044",
      local: { nombre: "Café Bistrô", direccion: "Irarrázaval 3250" },
      cliente: { nombre: "Camila Rojas", direccion: "Irarrázaval 3300" },
      estado: "DISPONIBLE",
      pago: 2700,
    },
    {
      numero: "#1850",
      local: { nombre: "Pizzería Napoli", direccion: "Manuel Montt 1520" },
      cliente: { nombre: "Felipe Díaz", direccion: "Manuel Montt 1600" },
      repartidor: javier._id,
      estado: "ACEPTADO",
      distanciaKm: 2.5,
      tiempoEstimadoMin: 18,
      pago: 15200,
      codigoConfirmacion: "1850",
      horaAceptado: new Date(),
    },
    {
      numero: "#1038",
      local: { nombre: "Empanadas Don Lucho", direccion: "Av. Vitacura 4500" },
      cliente: { nombre: "Sofía Muñoz", direccion: "Vitacura 4600" },
      repartidor: javier._id,
      estado: "ENTREGADO",
      pago: 4500,
      propina: 1000,
      horaAceptado: new Date(Date.now() - 1000 * 60 * 90),
      horaEntregado: new Date(Date.now() - 1000 * 60 * 60),
    },
  ]);

  console.log("[seed] Listo: 1 repartidor (pedro.ortega@ejemplo.com / 12345678) y 5 pedidos.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Error:", err);
  process.exit(1);
});
