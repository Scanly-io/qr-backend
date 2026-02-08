import { db } from "../db.js";
import { microsites } from "../schema.js";
import { eq } from "drizzle-orm";
import { getRedisClient, verifyJWT, withDLQ } from "@qr/common";
import { micrositeCacheKey, micrositeDataCacheKey } from "../utils/cachedKeys.js";
import { CACHE_VERSION } from "../constants.js";
import { renderMicrosite } from "../utils/render.js";

// Canonical publish route (cleaned of temporary debug logs)
export default async function publishRoutes(app: any) {
  app.post("/microsite/:qrId/publish", {
    preHandler: [verifyJWT],
    schema: {
      tags: ["Microsites"],
      summary: "Publish a microsite's HTML",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: { qrId: { type: "string", description: "QR ID or Microsite ID (UUID)" } },
        required: ["qrId"]
      },
      response: {
        200: { type: "object", properties: { message: { type: "string" }, length: { type: "number" } } },
        401: { type: "object", properties: { error: { type: "string" } } },
        403: { type: "object", properties: { error: { type: "string" } } },
        404: { type: "object", properties: { error: { type: "string" } } },
        500: { type: "object", properties: { error: { type: "string" } } }
      }
    }
  }, async (req: any, reply: any) => {
    const { qrId } = req.params;
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "Unauthenticated" });

    // Try to fetch by qrId first, then by id (UUID) as fallback
    const fetchResult = await withDLQ(
      async () => {
        // Try qrId first
        let results = await db.select().from(microsites).where(eq(microsites.qrId, qrId)).limit(1);
        
        // If not found, try as microsite id (UUID)
        if (results.length === 0) {
          results = await db.select().from(microsites).where(eq(microsites.id, qrId)).limit(1);
        }
        
        return results;
      },
      {
        service: "microsite",
        operation: "microsite.fetch",
        metadata: { qrId, userId: user.id },
      }
    );

    if (!fetchResult.success) {
      return reply.code(500).send({ error: "Failed to fetch microsite" });
    }

    const site = fetchResult.data[0];
    if (!site) return reply.code(404).send({ error: "Microsite not found" });
    if (site.createdBy && site.createdBy !== user.id) return reply.code(403).send({ error: "Forbidden" });

    // Render microsite with error handling
    const renderResult = await withDLQ(
      async () => {
        const html = (await renderMicrosite(site)) ?? "";
        return html;
      },
      {
        service: "microsite",
        operation: "microsite.render",
        metadata: { qrId, layout: site.layout },
      }
    );

    if (!renderResult.success) {
      return reply.code(500).send({ error: "Failed to render microsite" });
    }

    const html = renderResult.data;

    // Update database with error handling (use site.id, not param qrId)
    const updateResult = await withDLQ(
      () => db.update(microsites).set({ publishedHtml: html, publishedAt: new Date() }).where(eq(microsites.id, site.id)),
      {
        service: "microsite",
        operation: "microsite.publish",
        metadata: { qrId: site.qrId, micrositeId: site.id, htmlLength: html.length },
      }
    );

    if (!updateResult.success) {
      return reply.code(500).send({ error: "Failed to publish microsite" });
    }

    // Cache with error handling (non-critical, just log if fails)
    // Use the actual qrId from database, not the param (which might be micrositeId)
    const actualQrId = site.qrId || qrId;
    const cacheResult = await withDLQ(
      async () => {
        const cache = await getRedisClient();
        // Invalidate all cache keys (HTML, UUID, and JSON data), then set fresh HTML cache
        const qrIdCacheKey = `${micrositeCacheKey(actualQrId)}:${CACHE_VERSION}`;
        const uuidCacheKey = `microsite:id:${site.id}:${CACHE_VERSION}`;
        const dataCacheKey = `${micrositeDataCacheKey(actualQrId)}:${CACHE_VERSION}`;
        await cache.del(qrIdCacheKey);
        await cache.del(uuidCacheKey);
        await cache.del(dataCacheKey);
        // Set fresh cache with new HTML
        await cache.set(qrIdCacheKey, html);
        await cache.set(uuidCacheKey, html);
      },
      {
        service: "microsite",
        operation: "microsite.cache",
        metadata: { qrId: actualQrId, micrositeId: site.id },
      }
    );

    if (!cacheResult.success) {
      req.log?.warn({ qrId }, "Published but cache update failed");
    }

    return { message: "Published successfully", length: html.length };
  });
}
