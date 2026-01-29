import { randomUUID } from "crypto";
// Use extension-less imports so tsx/TypeScript resolves the source .ts correctly
import { db } from "../db";
import { qrs } from "../schema";
import { createProducer, getRedisClient, verifyJWT, withDLQ } from "@qr/common";
import { eq } from "drizzle-orm";
import { generateQrPng, QRStyle } from "../services/qrGenerator.js";

// Local cache key helper (previously imported from missing file)
function qrImageCacheKey(qrId: string): string {
  return `qr:image:${qrId}`;
}

export default async function qrRoutes(app: any) {
  // Initialize producer lazily on first request, not at plugin load time
  let producer: any = null;
  const getProducer = async () => {
    if (!producer) {
      producer = await createProducer();
    }
    return producer;
  };

  // CREATE QR
  app.post("/generate", {
    schema: {
      tags: ["QR Codes"],
      description: "Generate a new QR code with optional styling",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["targetUrl"],
        properties: {
          targetUrl: { type: "string", format: "uri", description: "Target URL for the QR code" },
          qrId: { type: "string", description: "Optional custom QR ID (if not provided, will be auto-generated)" },
          style: {
            type: "object",
            description: "Optional styling for the QR code",
            properties: {
              primaryColor: { type: "string", description: "Main color for QR code (hex)" },
              backgroundColor: { type: "string", description: "Background color (hex)" },
              dotStyle: { type: "string", enum: ["rounded", "dots", "classy", "square"] },
              cornerSquareStyle: { type: "string", enum: ["dot", "square", "extra-rounded"] },
              cornerDotStyle: { type: "string", enum: ["dot", "square"] },
              logo: { type: "string", description: "Logo URL or data URL" },
              logoSize: { type: "number", description: "Logo size ratio (0.0 to 1.0)" },
            },
          },
        },
      },
      response: {
        201: {
          description: "QR code created successfully",
          type: "object",
          properties: {
            qrId: { type: "string", description: "Generated QR code ID" },
            targetUrl: { type: "string", description: "Target URL" },
          },
        },
        400: {
          description: "Invalid input",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        409: {
          description: "QR ID already exists",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    preHandler: [verifyJWT]
  }, async (req: any, res: any) => {
    const producerInstance = await getProducer();
    const { targetUrl, qrId: providedQrId, style } = req.body;
    const user = req.user;
    const created_by = user ? user.id : null;

    if (!targetUrl || typeof targetUrl !== "string") {
      return res.code(400).send({ error: "Invalid targetUrl" });
    }

    // Use provided qrId or generate a new one
    const id = providedQrId || randomUUID();

    // If qrId was provided, check if it already exists
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

    // Save QR to database with error handling
    const dbResult = await withDLQ(
      () => db.insert(qrs).values({
        qrId: id,
        targetUrl,
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

    // Emit event with error handling
    const eventResult = await withDLQ(
      () => producerInstance.send({
        topic: "qr.events",
        messages: [
          {
            value: JSON.stringify({
              type: "qr.created",
              payload: {
                qrId: id,
                targetUrl,
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

    if (!eventResult.success) {
      // Event failed but QR was created - log warning but return success
      req.log?.warn({ qrId: id }, "QR created but event failed to send");
    }

    res.code(201).send({ qrId: id, targetUrl });
  });

  // ═══════════════════════════════════════════════════════════
  // SCAN TRACKING & REDIRECT
  // ═══════════════════════════════════════════════════════════
  /**
   * GET /scan/:qrId
   * 
   * QR code scan tracking endpoint that:
   * 1. Records a qr.scanned event to Kafka
   * 2. Redirects user to the target URL (microsite)
   * 
   * This is the URL that should be ENCODED IN THE QR CODE IMAGE.
   * Not the microsite URL directly!
   * 
   * Flow:
   * User scans QR → Camera opens https://qr.example.com/scan/abc123
   * → This endpoint tracks scan → Redirects to https://microsites.example.com/abc123
   * → Microsite tracks view
   * 
   * Benefits:
   * - Distinguishes QR scans from direct microsite links
   * - Tracks scan location (IP geolocation)
   * - Tracks scan device (User-Agent parsing)
   * - Can do A/B testing, smart redirects, etc.
   */
  app.get("/scan/:qrId", {
    schema: {
      tags: ["QR Codes"],
      description: "Track QR scan and redirect to target URL",
      params: {
        type: "object",
        properties: {
          qrId: { type: "string", description: "QR code ID" },
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
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
  }, async (req: any, res: any) => {
    const { qrId } = req.params;
    const producerInstance = await getProducer();

    // Get user metadata
    const ip = req.ip || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Fetch QR code from database
    const qrResult = await db
      .select()
      .from(qrs)
      .where(eq(qrs.qrId, qrId))
      .limit(1);

    if (qrResult.length === 0) {
      return res.code(404).send({ error: "QR code not found" });
    }

    const qr = qrResult[0];
    const targetUrl = qr.targetUrl;

    // Track qr.scanned event (fire-and-forget)
    producerInstance.send({
      topic: "analytics.events",
      messages: [
        {
          value: JSON.stringify({
            eventType: "qr.scanned",
            qrId,
            timestamp: new Date().toISOString(),
            metadata: {
              ip,
              userAgent,
              targetUrl,
            },
          }),
        },
      ],
    }).catch((err: any) => {
      req.log?.error({ err, qrId }, "Failed to send qr.scanned event");
    });

    // Redirect to target URL
    res.redirect(302, targetUrl);
  });

  // GET QR METADATA
  app.get("/qr/:qrId", {
    schema: {
      tags: ["QR Codes"],
      description: "Get QR code metadata",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          qrId: { type: "string", description: "QR code ID" },
        },
        required: ["qrId"],
      },
      response: {
        200: {
          description: "QR code metadata",
          type: "object",
          properties: {
            qrId: { type: "string", description: "QR code ID" },
            targetUrl: { type: "string", description: "Target URL" },
          },
        },
        403: {
          description: "Forbidden - not the owner",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        404: {
          description: "QR code not found",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    preHandler: [verifyJWT]
  }, async (req: any, res: any) => {
    const { qrId } = req.params;
    const user = req.user;

    // Fetch QR with error handling
    const fetchResult = await withDLQ(
      () => db
        .select()
        .from(qrs)
        .where(eq(qrs.qrId, qrId))
        .limit(1),
      {
        service: "qr",
        operation: "qr.fetch",
        metadata: { qrId, userId: user.id },
      }
    );

    if (!fetchResult.success) {
      return res.code(500).send({ error: "Failed to fetch QR code" });
    }

    const record = fetchResult.data;

    if (record.length === 0) {
      return res.code(404).send({ error: "QR code not found" });
    }

    if (record[0].createdBy !== user.id) {
      return res.code(403).send({ error: "Forbidden" });
    }

    res.code(200).send({
      qrId: record[0].qrId,
      targetUrl: record[0].targetUrl,
    });
  });

  // GENERATE PNG QR IMAGE
  app.get("/qr/:qrId/image", {
    schema: {
      tags: ["QR Codes"],
      description: "Get QR code as PNG image",
      params: {
        type: "object",
        properties: {
          qrId: { type: "string", description: "QR code ID" },
        },
        required: ["qrId"],
      },
      response: {
        200: {
          description: "QR code PNG image",
          type: "string",
          format: "binary",
        },
        404: {
          description: "QR code not found",
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  }, async (req: any, res: any) => {
    const { qrId } = req.params;

    const cacheKey = qrImageCacheKey(qrId);

    // Redis check
    const cache = await getRedisClient();
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.type("image/png");
      return Buffer.from(cached, "base64");
    }

    // DB lookup
    const records = await db
      .select()
      .from(qrs)
      .where(eq(qrs.qrId, qrId))
      .limit(1);

    if (records.length === 0) {
      return res.code(404).send({ message: "QR code not found" });
    }

    // Generate PNG with stored style
    const qrStyle = records[0].style as QRStyle | null;
    const png = await generateQrPng(records[0].targetUrl, qrStyle || undefined);

    // Cache 24 hours
    await cache.set(cacheKey, png.toString("base64"), {
      EX: 60 * 60 * 24,
    });

    res.type("image/png").send(png);
  });
}
