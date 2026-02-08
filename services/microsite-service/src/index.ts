import "dotenv/config";
import { buildServer, logger, createConsumer } from "@qr/common";
import type { Consumer } from "kafkajs";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyStatic from "@fastify/static";
import publishRoutes from "./routes/publish";
import renderRoutes from "./routes/render.ts";
import micrositeRoutes from "./routes/microsite.ts";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.SERVICE_NAME = "microsite-service";

/**
 * Build and configure the Fastify app (exported for testing)
 */
export async function buildApp() {
  const app = buildServer();
  
  app.register(fastifySwagger, {
  openapi: {
    info: { title: "Microsite Service API", description: "QR code microsite publishing and rendering service", version: "1.0.0" },
    servers: [{ url: "http://localhost:3005", description: "Development server" }],
    tags: [
      { name: "Microsites", description: "Microsite operations" },
      { name: "Health", description: "Health check endpoints" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  }
  });
  app.register(fastifySwaggerUi, { routePrefix: "/docs", uiConfig: { docExpansion: "list", deepLinking: true }, staticCSP: true });

  // Serve static files (JavaScript for interactive microsites)
  // In development: serves from src/utils, in production: serves from dist/utils
  const staticPath = path.join(__dirname, "utils");
  app.register(fastifyStatic, {
    root: staticPath,
    prefix: "/static/",
    decorateReply: false
  });
  
  logger.info({ staticPath }, "Static files configured");

  // Register microsite routes with /microsite prefix BEFORE the health check to avoid conflicts
  app.register(micrositeRoutes, { prefix: "/microsite" });
  app.register(publishRoutes);
  app.register(renderRoutes);

  return app;
}

const port = Number(process.env.PORT || 3005);
let consumer: Consumer | null = null;

// Only start the server if this file is being run directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const app = await buildApp();
    
    app.listen({ port, host: '0.0.0.0' })
      .then(() => logger.info(`Microsite service running on :${port}`))
      .catch((err) => { logger.error({ err }, "Failed to start server"); process.exit(1); });

    async function createConsumerInstance() {
      try {
        consumer = await createConsumer("microsite-group");
        if (!consumer) throw new Error("Consumer not initialized");
        await consumer.subscribe({ topic: "qr.events", fromBeginning: true });
        await consumer.run({ eachMessage: async ({ topic, partition, message }) => {
          const value = message.value?.toString();
          logger.info({ event: "mq.message.received", topic, partition, value }, "Message received from MQ");
        }});
        logger.info("Consumer created and subscribed to qr.events");
      } catch (err) {
        logger.error({ err }, "Failed to create consumer");
      }
    }

    createConsumerInstance();
  })();
}
