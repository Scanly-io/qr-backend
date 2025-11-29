import { buildServer, logger } from "@qr/common";
import dotenv from "dotenv";
import loginRoutes from "./routes/login.js";  
import meRoutes from "./routes/me.js";  
import signupRoutes from "./routes/signup.js";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

dotenv.config();   
console.log("starting auth-service...");
process.env.SERVICE_NAME = "auth-service";
const app = buildServer();
const port = Number(process.env.PORT || 3001);

// Register Swagger documentation
app.register(fastifySwagger, {
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

app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
  },
  staticCSP: true,
});

app.register(loginRoutes);
app.register(meRoutes);
app.register(signupRoutes);

app.get("/auth", async () => ({ service: "auth-service", ok: true }));
app.listen({ port })
  .then(() => logger.info(`Auth service running on :${port} <- auth-service`))
  .catch((err) => {
    logger.error("Failed to start server", err && err.stack ? err.stack : err);
    process.exit(1);
  });   
