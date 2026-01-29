import dotenv from "dotenv";
// Load environment variables BEFORE importing anything from @qr/common
dotenv.config();

import { buildServer, logger } from "@qr/common";
import loginRoutes from "./routes/login.js";  
import meRoutes from "./routes/me.js";  
import signupRoutes from "./routes/signup.js";
import refreshRoutes from "./routes/refresh.js";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

/**
 * Build and configure the Fastify app
 * Exported for testing purposes
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = buildServer();
  
  // Register Swagger documentation
  await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Auth Service API",
      description: "Authentication and user management service",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Authentication", description: "User authentication operations" },
      { name: "Users", description: "User management" },
      { name: "Health", description: "Health check endpoints" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
});

await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: true,
  });

  await app.register(loginRoutes);
  await app.register(meRoutes);
  await app.register(signupRoutes);
  await app.register(refreshRoutes);

  app.get("/auth", async () => ({ service: "auth-service", ok: true }));
  
  return app;
}

// Only start server if this file is run directly (not imported for tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("starting auth-service...");
  process.env.SERVICE_NAME = "auth-service";
  const port = Number(process.env.PORT || 3001);
  
  buildApp()
    .then((app) => {
      return app.listen({ port, host: '0.0.0.0' }).then(() => port);
    })
    .then((port) => logger.info(`Auth service running on :${port} <- auth-service`))
    .catch((err) => {
      console.error("Failed to start server:", err);
      logger.error("Failed to start server", err);
      process.exit(1);
    });
}   
