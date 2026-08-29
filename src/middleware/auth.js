const jwt = require("jsonwebtoken");
const Repartidor = require("../models/Repartidor");

const JWT_EXPIRES_IN = "12h";

function firmarToken(repartidor) {
  return jwt.sign({ sub: repartidor._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Se ejecuta en cada request GraphQL (ver apolloServer.js -> context).
 * Lee el header "Authorization: Bearer <token>", lo valida y deja al
 * repartidor autenticado disponible en el context de los resolvers.
 * Si el token falta o es inválido, el context.repartidor queda en null
 * (no se rechaza la request acá — cada resolver decide si requiere sesión).
 */
async function getRepartidorDesdeRequest(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const repartidor = await Repartidor.findById(payload.sub);
    return repartidor || null;
  } catch (err) {
    return null;
  }
}

function requireAuth(repartidor) {
  if (!repartidor) {
    const err = new Error("No autenticado. Envía el token en el header Authorization.");
    err.extensions = { code: "UNAUTHENTICATED" };
    throw err;
  }
}

module.exports = { firmarToken, getRepartidorDesdeRequest, requireAuth };
