/**
 * QR Service Routes with Redis Caching
 * 
 * Cache Strategy:
 * - LIST: Cache QR code lists for 5 minutes, invalidate on create/update/delete
 * - GET: Cache individual QR codes for 30 minutes, invalidate on update/delete
 * - SCAN: Increment real-time counters in Redis, publish to Kafka async
 */

import { randomUUID } from "crypto";
import { db } from "../db";
import { qrs } from "../schema";
import { createProducer, verifyJWT, withDLQ } from "@qr/common";
import { eq } from "drizzle-orm";
import { generateQrPng, QRStyle } from "../services/qrGenerator.js";
import {
  getCache,
  setCache,
  deleteCache,
  incrementCounter,
  getCounter,
  CacheKeys,
  CACHE_TTL,
} from "../lib/cache.js";

export default async function qrRoutes(app: any) {
  // Initialize producer lazily
  let producer: any = null;
  const getProducer = async () => {
    if (!producer) {
      producer = await createProducer();
    }
    return producer;
  };

  /**
   * GET /qr
   * List all QR codes for the authenticated tenant
   * 
   * CACHE: 5 minute TTL, invalidated on create/update/delete
   */
  app.get("/qr", {
    schema: {
      tags: ["QR Codes"],
      description: "List all QR codes for the current tenant",
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: "List of QR codes",
          type: "object",
          properties: {
            qrCodes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  qrId: { type: "string" },
                  targetUrl: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  scans: { type: "number" },
                },
              },
            },
            count: { type: "number" },
            cached: { type: "boolean" },
          },
        },
      },
    },
    preHandler: [verifyJWT],
  }, async (req: any, res: any) => {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    
    if (!tenantId) {
      return res.code(401).send({ error: 'Tenant ID required' });
    }

    // Check cache first
    const cacheKey = CacheKeys.qrList(tenantId);
    const cached = await getCache<any[]>(cacheKey);
    
    if (cached) {
      req.log?.debug({ tenantId }, 'QR list cache hit');
      return res.send({ qrCodes: cached, count: cached.length, cached: true });
    }

    // Cache miss - query database
    req.log?.debug({ tenantId }, 'QR list cache miss - querying database');
    const qrCodes = await db
      .select()
      .from(qrs)
      .where(eq(qrs.tenantId, tenantId));

    // Enrich with scan counts from Redis
    const enriched = await Promise.all(
      qrCodes.map(async (qr) => {
        const scans = await getCounter(CacheKeys.scanCount(qr.qrId));
        return { ...qr, scans };
      })
    );

    // Store in cache
    await setCache(cacheKey, enriched, CACHE_TTL.QR_LIST);
    
    return res.send({ qrCodes: enriched, count: enriched.length, cached: false });
  });

  /**
   * GET /qr/:qrId
   * Get single QR code details
   * 
   * CACHE: 30 minute TTL, invalidated on update/delete
   */
  app.get("/qr/:qrId", {
    schema: {
      tags: ["QR Codes"],
      description: "Get single QR code details",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          qrId: { type: "string" },
        },
        required: ["qrId"],
      },
      response: {
        200: {
          description: "QR code details",
          type: "object",
          properties: {
            qrId: { type: "string" },
            targetUrl: { type: "string" },
            createdAt: { type: "string" },
            scans: { type: "number" },
            cached: { type: "boolean" },
          },
        },
        404: {
          description: "QR code not found",
          type: "object",
          properties: { error: { type: "string" } },
        },
      },
    },
    preHandler: [verifyJWT],
  }, async (req: any, res: any) => {
    const { qrId } = req.params;
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

    // Check cache first
    const cacheKey = CacheKeys.qrSingle(tenantId, qrId);
    const cached = await getCache<any>(cacheKey);
    
    if (cached) {
      req.log?.debug({ qrId, tenantId }, 'QR code cache hit');
      return res.send({ ...cached, cached: true });
    }

    // Cache miss - query database
    req.log?.debug({ qrId, tenantId }, 'QR code cache miss - querying database');
    const qrCode = await db
      .select()
      .from(qrs)
      .where(eq(qrs.qrId, qrId))
      .limit(1);

    if (qrCode.length === 0) {
      return res.code(404).send({ error: "QR code not found" });
    }

    // Verify tenant ownership
    if (qrCode[0].tenantId !== tenantId) {
      return res.code(403).send({ error: "Forbidden" });
    }

    // Add scan count from Redis
    const scans = await getCounter(CacheKeys.scanCount(qrId));
    const enriched = { ...qrCode[0], scans };

    // Store in cache
    await setCache(cacheKey, enriched, CACHE_TTL.QR_SINGLE);
    
    return res.send({ ...enriched, cached: false });
  });

  /**
   * POST /generate
   * Create new QR code
   * 
   * CACHE: Invalidates tenant's QR list cache
   */
  app.post("/generate", {
    schema: {
      tags: ["QR Codes"],
      description: "Generate a new QR code with optional styling",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["targetUrl"],
        properties: {
          targetUrl: { type: "string", format: "uri" },
          qrId: { type: "string" },
          style: { type: "object" },
        },
      },
      response: {
        201: {
          description: "QR code created successfully",
          type: "object",
          properties: {
            qrId: { type: "string" },
            targetUrl: { type: "string" },
          },
        },
      },
    },
    preHandler: [verifyJWT],
  }, async (req: any, res: any) => {
    const producerInstance = await getProducer();
    const { targetUrl, qrId: providedQrId, style } = req.body;
    const user = req.user;
    const tenantId = req.headers['x-tenant-id'] || user?.tenantId;
    const created_by = user ? user.id : null;

    if (!targetUrl || typeof targetUrl !== "string") {
      return res.code(400).send({ error: "Invalid targetUrl" });
    }

    // Use provided qrId or generate a new one
    const id = providedQrId || randomUUID();

    // Check if QR ID already exists
    if (providedQrId) {
      const existing = await db
        .select()
        .from(qrs)
        .where(eq(qrs.qrId, providedQrId))
        .limit(1);
      
      if (existing.length > 0) {
        return res.code(409).send({ error: "QR ID already exists" });
      }
    }

    // Save QR to database
    const dbResult = await withDLQ(
      () => db.insert(qrs).values({
        qrId: id,
        targetUrl,
        tenantId,
        createdBy: created_by,
        style: style || null,
      }),
      {
        service: "qr",
        operation: "qr.create",
        metadata: { qrId: id, targetUrl, userId: created_by },
      }
    );

    if (!dbResult.success) {
      return res.code(500).send({ error: "Failed to create QR code" });
    }

    // INVALIDATE CACHE: Clear tenant's QR list
    await deleteCache(CacheKeys.qrList(tenantId));
    req.log?.info({ tenantId, qrId: id }, 'Cache invalidated after QR creation');

    // Emit event
    await withDLQ(
      () => producerInstance.send({
        topic: "qr.events",
        messages: [
          {
            value: JSON.stringify({
              type: "qr.created",
              payload: {
                qrId: id,
                targetUrl,
                tenantId,
                createdBy: created_by,
                timestamp: new Date().toISOString(),
              },
            }),
          },
        ],
      }),
      {
        service: "qr",
        operation: "qr.event.send",
        metadata: { qrId: id, eventType: "qr.created" },
      }
    );

    res.code(201).send({ qrId: id, targetUrl });
  });

  /**
   * PATCH /qr/:qrId
   * Update QR code
   * 
   * CACHE: Invalidates both list and single QR cache
   */
  app.patch("/qr/:qrId", {
    schema: {
      tags: ["QR Codes"],
      description: "Update QR code",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          qrId: { type: "string" },
        },
        required: ["qrId"],
      },
      body: {
        type: "object",
        properties: {
          targetUrl: { type: "string" },
          style: { type: "object" },
        },
      },
    },
    preHandler: [verifyJWT],
  }, async (req: any, res: any) => {
    const { qrId } = req.params;
    const { targetUrl, style } = req.body;
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

    // Verify ownership
    const existing = await db
      .select()
      .from(qrs)
      .where(eq(qrs.qrId, qrId))
      .limit(1);

    if (existing.length === 0) {
      return res.code(404).send({ error: "QR code not found" });
    }

    if (existing[0].tenantId !== tenantId) {
      return res.code(403).send({ error: "Forbidden" });
    }

    // Update database
    await db
      .update(qrs)
      .set({
        ...(targetUrl && { targetUrl }),
        ...(style && { style }),
        updatedAt: new Date(),
      })
      .where(eq(qrs.qrId, qrId));

    // INVALIDATE CACHE: Clear both list and single QR cache
    await deleteCache(CacheKeys.qrList(tenantId));
    await deleteCache(CacheKeys.qrSingle(tenantId, qrId));
    req.log?.info({ tenantId, qrId }, 'Cache invalidated after QR update');

    return res.send({ success: true });
  });

  /**
   * DELETE /qr/:qrId
   * Delete QR code
   * 
   * CACHE: Invalidates both list and single QR cache, clears scan counters
   */
  app.delete("/qr/:qrId", {
    schema: {
      tags: ["QR Codes"],
      description: "Delete QR code",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          qrId: { type: "string" },
        },
        required: ["qrId"],
      },
    },
    preHandler: [verifyJWT],
  }, async (req: any, res: any) => {
    const { qrId } = req.params;
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

    // Verify ownership
    const existing = await db
      .select()
      .from(qrs)
      .where(eq(qrs.qrId, qrId))
      .limit(1);

    if (existing.length === 0) {
      return res.code(404).send({ error: "QR code not found" });
    }

    if (existing[0].tenantId !== tenantId) {
      return res.code(403).send({ error: "Forbidden" });
    }

    // Delete from database
    await db.delete(qrs).where(eq(qrs.qrId, qrId));

    // INVALIDATE CACHE: Clear all related caches
    await deleteCache(CacheKeys.qrList(tenantId));
    await deleteCache(CacheKeys.qrSingle(tenantId, qrId));
    await deleteCache(CacheKeys.scanCount(qrId));
    await deleteCache(`${CacheKeys.scanCount(qrId)}:*`); // Daily counters
    req.log?.info({ tenantId, qrId }, 'Cache invalidated after QR deletion');

    return res.send({ success: true });
  });

  /**
   * GET /scan/:qrId
   * Track QR scan and redirect
   * 
   * CACHE: Increments scan counter in Redis (real-time), publishes to Kafka async
   */
  app.get("/scan/:qrId", {
    schema: {
      tags: ["QR Codes"],
      description: "Track QR scan and redirect to target URL",
      params: {
        type: "object",
        properties: {
          qrId: { type: "string" },
        },
        required: ["qrId"],
      },
      response: {
        302: {
          description: "Redirect to target URL",
          type: "null",
        },
        404: {
          description: "QR code not found",
          type: "object",
          properties: { error: { type: "string" } },
        },
      },
    },
  }, async (req: any, res: any) => {
    const producerInstance = await getProducer();
    const { qrId } = req.params;

    // Get QR code details (might be cached)
    const qrCode = await db
      .select()
      .from(qrs)
      .where(eq(qrs.qrId, qrId))
      .limit(1);

    if (qrCode.length === 0) {
      return res.code(404).send({ error: "QR code not found" });
    }

    const { targetUrl, tenantId } = qrCode[0];

    // INCREMENT SCAN COUNTERS IN REDIS (super fast!)
    const today = new Date().toISOString().split('T')[0];
    const totalScans = await incrementCounter(CacheKeys.scanCount(qrId));
    const dailyScans = await incrementCounter(
      CacheKeys.scanCountDaily(qrId, today),
      CACHE_TTL.SCAN_COUNT
    );

    req.log?.info({
      qrId,
      totalScans,
      dailyScans,
      tenantId,
    }, 'QR code scanned - counters incremented');

    // Publish scan event to Kafka (async, don't block redirect)
    withDLQ(
      () => producerInstance.send({
        topic: "qr.events",
        messages: [
          {
            value: JSON.stringify({
              type: "qr.scanned",
              payload: {
                qrId,
                tenantId,
                scannedAt: new Date().toISOString(),
                userAgent: req.headers["user-agent"],
                ip: req.ip,
                referer: req.headers.referer || null,
              },
            }),
          },
        ],
      }),
      {
        service: "qr",
        operation: "qr.scan.track",
        metadata: { qrId, tenantId },
      }
    ).catch(err => {
      // Log but don't block redirect
      req.log?.error({ err, qrId }, 'Failed to publish scan event');
    });

    // Redirect user to target URL
    return res.redirect(302, targetUrl);
  });

  /**
   * GET /qr/:qrId/stats
   * Get QR code scan statistics
   * 
   * CACHE: Reads from Redis counters (real-time)
   */
  app.get("/qr/:qrId/stats", {
    schema: {
      tags: ["QR Codes"],
      description: "Get QR code scan statistics",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          qrId: { type: "string" },
        },
        required: ["qrId"],
      },
      response: {
        200: {
          description: "QR code statistics",
          type: "object",
          properties: {
            qrId: { type: "string" },
            totalScans: { type: "number" },
            scansToday: { type: "number" },
          },
        },
      },
    },
    preHandler: [verifyJWT],
  }, async (req: any, res: any) => {
    const { qrId } = req.params;
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

    // Verify ownership
    const qrCode = await db
      .select()
      .from(qrs)
      .where(eq(qrs.qrId, qrId))
      .limit(1);

    if (qrCode.length === 0) {
      return res.code(404).send({ error: "QR code not found" });
    }

    if (qrCode[0].tenantId !== tenantId) {
      return res.code(403).send({ error: "Forbidden" });
    }

    // Read counters from Redis (real-time!)
    const today = new Date().toISOString().split('T')[0];
    const totalScans = await getCounter(CacheKeys.scanCount(qrId));
    const scansToday = await getCounter(CacheKeys.scanCountDaily(qrId, today));

    return res.send({
      qrId,
      totalScans,
      scansToday,
    });
  });
}
