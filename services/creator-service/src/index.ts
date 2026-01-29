import "dotenv/config";
import { buildServer, logger } from "@qr/common";
import socialPlannerRoutes from "./routes/social-planner.js";
import autoReplyRoutes from "./routes/auto-reply.js";
import contentIdeasRoutes from "./routes/content-ideas.js";
import collectionsRoutes from "./routes/collections.js";
import productsRoutes from "./routes/products.js";
import earningsRoutes from "./routes/earnings.js";
import shareRoutes from "./routes/share.js";

process.env.SERVICE_NAME = "creator-service";

export async function buildApp() {
  const app = buildServer();

  // Health check
  app.get("/health", async () => ({ 
    status: "ok", 
    service: "creator-service",
    features: [
      "social-planner",
      "auto-reply",
      "content-ideas",
      "collections",
      "products",
      "earnings",
      "share"
    ]
  }));

  // Register routes
  await app.register(socialPlannerRoutes, { prefix: "/social-planner" });
  await app.register(autoReplyRoutes, { prefix: "/auto-reply" });
  await app.register(contentIdeasRoutes, { prefix: "/content-ideas" });
  await app.register(collectionsRoutes, { prefix: "/collections" });
  await app.register(productsRoutes, { prefix: "/products" });
  await app.register(earningsRoutes, { prefix: "/earnings" });
  await app.register(shareRoutes, { prefix: "/share" });

  return app;
}

const port = Number(process.env.PORT || 3020);

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const app = await buildApp();
      await app.listen({ port, host: "0.0.0.0" });
      logger.info(`🎨 Creator Service running on port ${port}`);
    } catch (err) {
      logger.error(err);
      process.exit(1);
    }
  })();
}
