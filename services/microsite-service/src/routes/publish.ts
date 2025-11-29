import { db } from "../db.js";
import { microsites } from "../schema.js";
import { eq } from "drizzle-orm";
import { getRedisClient, authGuard } from "@qr/common";
import { micrositeCacheKey } from "../utils/cachedKeys.js";
import { renderMicrosite } from "../utils/render.js";

// Canonical publish route (cleaned of temporary debug logs)
export default async function publishRoutes(app: any) {
  app.post("/microsite/:qrId/publish", {
    preHandler: async (req: any, reply: any) => { await authGuard(req, reply); },
    schema: {
      tags: ["Microsites"],
      summary: "Publish a microsite's HTML",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: { qrId: { type: "string" } },
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
    const user = (req as any).user;
    if (!user) return reply.code(401).send({ error: "Unauthenticated" });

    let siteRows: any[] = [];
    try {
      siteRows = await db.select().from(microsites).where(eq(microsites.qrId, qrId)).limit(1);
    } catch (err: any) {
      req.log?.error({ err }, "publish DB fetch error");
      return reply.code(500).send({ error: "DB error" });
    }
    const site = siteRows[0];
    if (!site) return reply.code(404).send({ error: "Microsite not found" });
    if (site.createdBy && site.createdBy !== user.id) return reply.code(403).send({ error: "Forbidden" });

    const html = (await renderMicrosite(site)) ?? "";
    await db.update(microsites).set({ publishedHtml: html, publishedAt: new Date() }).where(eq(microsites.qrId, qrId));

    const cache = await getRedisClient();
    await cache.set(micrositeCacheKey(qrId), html);

    return { message: "Published successfully", length: html.length };
  });
}
