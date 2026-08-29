# FoodPlease · Backend (Repartidor)

API GraphQL para la app móvil del repartidor: Express + Apollo Server 4 +
Mongoose (MongoDB) + CORS + autenticación JWT.

## Modelos

- **Repartidor** (`src/models/Repartidor.js`): usuario de la app, con los
  campos que hoy se ven hardcodeados en `PerfilScreen.js` (nombre,
  calificación, vehículo, etc.) más `correo`/`passwordHash` para login.
- **Pedido** (`src/models/Pedido.js`): un pedido con local, cliente
  (embebido — ver nota abajo), estado (`DISPONIBLE → ACEPTADO →
  LLEGADA_LOCAL → RETIRADO → EN_CAMINO_CLIENTE → ENTREGADO`), pago, propina,
  código de confirmación y timestamps por cada transición de estado.

> **Nota de alcance:** el cliente (quien pide la comida) hoy vive en la
> plataforma web Django, fuera de este backend. Para este MVP los datos de
> cliente se embeben directamente en `Pedido` en vez de ser una colección
> propia. La integración real entre ambos sistemas (vía la API REST que
> propone el informe de la semana 9) queda como trabajo futuro.

## Ejecutar en local

```bash
npm install
cp .env.example .env   # y completa MONGO_URI con tu cluster de Atlas
npm run seed            # carga datos de ejemplo (ver credenciales abajo)
npm run dev              # o "npm start"
```

Servidor arriba en `http://localhost:4000/graphql`.

Usuario de prueba tras `npm run seed`:
- correo: `pedro.ortega@ejemplo.com`
- password: `12345678`

## Ejemplo de uso (login + query autenticada)

```graphql
mutation {
  login(correo: "pedro.ortega@ejemplo.com", password: "12345678") {
    token
    repartidor { nombre zona }
  }
}
```

Con el token devuelto, en el header de la siguiente request:
`Authorization: Bearer <token>`

```graphql
query {
  pedidosEnCurso {
    numero
    estado
    local { nombre }
    cliente { nombre direccion }
  }
}
```

## Variables de entorno

Ver `.env.example`. En producción (Azure App Service) se configuran en
"Configuration → Application settings" — ver `docs/despliegue-azure.md`.

## Despliegue

Guía paso a paso (MongoDB Atlas + Azure App Service, incluyendo por qué se
eligió Azure por sobre AWS): [`docs/despliegue-azure.md`](docs/despliegue-azure.md).

## Nota para probar el flujo completo en la app

`ConfirmarEntregaScreen` en la app móvil pide un código de 4 dígitos que,
en un sistema real, vería el cliente en su propia app. Como ese aplicativo
de cliente no es parte de este MVP, el código llega precargado desde el
backend (campo `codigoConfirmacion` del pedido) para poder demostrar el
flujo completo sin necesitar acceso directo a la base de datos — sigue
siendo editable, así que también se puede probar el caso de código
incorrecto.
