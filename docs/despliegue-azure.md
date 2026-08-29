# Guía de despliegue: Azure App Service + MongoDB Atlas

## ¿Por qué Azure y no AWS?

Ambas son válidas técnicamente (el backend es un Express+Node estándar, corre
igual en cualquiera de las dos). La razón práctica para elegir **Azure** en
este proyecto académico:

- **Azure for Students** entrega 100 USD de crédito **sin pedir tarjeta de
  crédito**, con solo el correo institucional (`.cl` de una universidad
  suele calificar). AWS exige tarjeta incluso para su capa gratuita.
- **App Service** tiene un plan **F1 (Free)** nativo para Node.js: se sube
  el código y queda corriendo, sin administrar servidores, contenedores ni
  balanceadores — apropiado para un prototipo académico.
- Se integra directo con **GitHub Actions** (Deployment Center genera el
  workflow automáticamente), lo que calza con el flujo que el equipo ya usa
  para EAS Build / GitHub Pages en la app móvil.

La base de datos (MongoDB) no vive en Azure ni en AWS: se usa **MongoDB
Atlas**, que tiene su propio nivel gratuito (M0) independiente del proveedor
de cómputo — es la forma estándar de usar Mongoose en producción sin
administrar un servidor de base de datos.

## 1. MongoDB Atlas (base de datos)

1. Crear cuenta gratuita en [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Crear un cluster **M0 (Free)**, cualquier región cercana (ej. `AWS /
   sa-east-1 São Paulo`, la más cercana a Chile disponible en el tier
   gratuito).
3. **Database Access** → crear un usuario de base de datos (usuario +
   contraseña, rol `readWrite` sobre la base `foodplease`).
4. **Network Access** → agregar `0.0.0.0/0` (permitir todas las IP). Para un
   proyecto académico es aceptable; en un entorno real se restringiría a las
   IP salientes del App Service.
5. **Connect → Drivers** → copiar el connection string, formato:
   ```
   mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/foodplease?retryWrites=true&w=majority
   ```
   Este valor va en `MONGO_URI`.

## 2. Azure App Service (backend)

1. Crear cuenta en [azure.microsoft.com/free/students](https://azure.microsoft.com/free/students/)
   (sin tarjeta) o usar una cuenta Azure existente.
2. Portal de Azure → **Crear un recurso → Web App**:
   - Nombre: `foodplease-api` (queda en `https://foodplease-api.azurewebsites.net`)
   - Publicar: **Código**
   - Stack en tiempo de ejecución: **Node 20 LTS**
   - Sistema operativo: **Linux**
   - Plan: **Free F1**
3. **Configuration → Application settings** → agregar (una por una, "New
   application setting"):
   - `MONGO_URI` = el connection string de Atlas
   - `JWT_SECRET` = un valor aleatorio largo (generar con
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `CORS_ORIGIN` = `https://dmalleaval.github.io,http://localhost:19006`
     (agregar la URL de Azure Static Web Apps si se despliega ahí la versión
     web)
   - `WEBSITE_NODE_DEFAULT_VERSION` = `~20` (si no quedó seteado por el
     stack elegido)
4. **Deployment Center** → conectar el repositorio de GitHub del backend →
   Azure genera automáticamente un archivo
   `.github/workflows/main_foodplease-api.yml` en el repo, que hace build y
   deploy en cada push a `main`.
5. Verificar: `https://foodplease-api.azurewebsites.net/health` debe
   responder `{"status":"ok"}`. `https://foodplease-api.azurewebsites.net/graphql`
   debe responder con Apollo Sandbox (o un error de método si se visita con
   GET simple, dependiendo de la versión — probar con POST o desde un
   cliente GraphQL).
6. Cargar datos de ejemplo en la base de producción: desde tu máquina, con
   el mismo `MONGO_URI` en un `.env` local, correr `npm run seed` una vez
   (apunta directo a Atlas, no a Azure — el seed es un script que solo
   necesita la conexión a la base).

## 3. Apuntar la app móvil al backend desplegado

1. En la carpeta de la app (`foodplease-repartidor`), crear `.env` a partir
   de `.env.example`:
   ```
   EXPO_PUBLIC_API_URL=https://foodplease-api.azurewebsites.net/graphql
   ```
2. Volver a generar el build web y el APK:
   ```bash
   npm run build:web && npm run deploy   # actualiza GitHub Pages
   npx eas-cli@latest build --platform android --profile preview   # nuevo APK
   ```

## 4. Checklist de verificación end-to-end

- [ ] `GET /health` en Azure responde `ok`.
- [ ] Login desde la app (web o APK) contra el backend desplegado funciona
      con el usuario de `npm run seed`.
- [ ] "Pedidos disponibles" muestra los pedidos cargados por el seed.
- [ ] Aceptar un pedido lo mueve a "Pedidos en curso" (persistido en Atlas,
      no solo en memoria del cliente).
- [ ] El flujo completo (aceptar → ir al local → actualizar estados → ir al
      cliente → confirmar entrega con código) llega hasta "Entrega
      completada" sin errores.
- [ ] Los datos sobreviven a un refresh / reinicio de la app (prueba de que
      no son datos simulados en memoria, sino que vienen de MongoDB).

## Costos y límites a tener presente

- App Service F1: duerme tras inactividad y tiene cuota de CPU/hora
  limitada — normal para demo, no para producción real.
- Atlas M0: 512 MB de almacenamiento, más que suficiente para este MVP.
- Ambos niveles gratuitos no requieren tarjeta bajo Azure for Students; si
  se usa una suscripción Azure normal, sí puede pedirla al crear la cuenta
  (aunque F1 no genera cargos).
