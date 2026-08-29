require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { connectDB } = require("./config/db");
const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");
const { getRepartidorDesdeRequest } = require("./middleware/auth");

async function main() {
  await connectDB();

  const app = express();

  // Orígenes permitidos: dev local (Expo web), build web en GitHub Pages y,
  // cuando exista, el dominio de producción. Se define por env var para no
  // tener que tocar código al desplegar (ver .env.example / guía de Azure).
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:19006")
    .split(",")
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Permite requests sin "origin" (apps móviles nativas, Postman, curl)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json());

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();

  app.use(
    "/graphql",
    expressMiddleware(apollo, {
      context: async ({ req }) => ({
        repartidor: await getRepartidorDesdeRequest(req),
      }),
    })
  );

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`[server] FoodPlease API arriba en http://localhost:${port}/graphql`);
  });
}

main().catch((err) => {
  console.error("[server] Error fatal al iniciar:", err);
  process.exit(1);
});
