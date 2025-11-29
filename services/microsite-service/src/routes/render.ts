import { db } from "../db.js";
import { microsites } from "../schema.js";
import { eq } from "drizzle-orm";
import { getRedisClient, createProducer } from "@qr/common";
import { micrositeCacheKey } from "../utils/cachedKeys.js";

export default async function renderRoutes(app: any) {
  let producer: any = null;
  let cache: any = null;

  const getProducer = async () => {
    if (!producer) producer = await createProducer();
    return producer;
  };
  const getCache = async () => {
    if (!cache) cache = await getRedisClient();
    return cache;
  };

  app.get("/public/:qrId", async (req: any, res: any) => {
    const { qrId } = req.params;
    const cacheInstance = await getCache();
    const cacheKey = micrositeCacheKey(qrId);

    // 1. Cache first
    const cached = await cacheInstance.get(cacheKey);
    if (cached) {
      const producerInstance = await getProducer();
      sendAnalytics(producerInstance, qrId);
      res.header("X-Cache", "HIT");
      return res.type("text/html").send(cached);
    }

    // 2. Load from DB (minimal logging retained)
    let siteRows: any[] = [];
    try {
      siteRows = await db.select().from(microsites).where(eq(microsites.qrId, qrId)).limit(1);
    } catch (err: any) {
      req.log?.error({ err, qrId }, "microsite DB fetch error");
      return res.code(500).send("Microsite DB error");
    }
    const site = siteRows[0];
    if (!site || !site.publishedHtml) return res.code(404).send("Microsite not published");

    // 3. Analytics + cache + serve
    const producerInstance = await getProducer();
    sendAnalytics(producerInstance, qrId);
    await cacheInstance.set(cacheKey, site.publishedHtml);
    res.header("X-Cache", "MISS");
    return res.type("text/html").send(site.publishedHtml);
  });
}

function sendAnalytics(producer: any, qrId: string) {
  producer.send({
    topic: "analytics.events",
    messages: [
      { value: JSON.stringify({ type: "microsite.viewed", qrId, timestamp: new Date().toISOString() }) }
    ]
  });
}
