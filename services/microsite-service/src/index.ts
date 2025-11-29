import "dotenv/config";
import { buildServer, logger, createConsumer } from "@qr/common";
import type { Consumer } from "kafkajs";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import publishRoutes from "./routes/publish";
import renderRoutes from "./routes/render.ts";
import micrositeRoutes from "./routes/microsite.ts";

process.env.SERVICE_NAME = "microsite-service";
const app = buildServer();
const port = Number(process.env.PORT || 3005);
let consumer: Consumer | null = null;

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
app.get("/microsite", async () => ({ service: "microsite-service", ok: true }));

app.listen({ port })
  .then(() => logger.info(`Microsite service running on :${port}`))
  .catch((err) => { console.error("Failed to start server", err?.stack || err); logger.error("Failed to start server", err); process.exit(1); });

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

app.register(micrositeRoutes);
app.register(publishRoutes);
app.register(renderRoutes);
createConsumerInstance();
