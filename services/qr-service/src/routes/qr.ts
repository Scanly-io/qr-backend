import { randomUUID } from "crypto";
// Use extension-less imports so tsx/TypeScript resolves the source .ts correctly
import { db } from "../db";
import { qrs } from "../schema";
import { createProducer, getRedisClient } from "@qr/common";
import { eq } from "drizzle-orm";
import { generateQrPng } from "../services/qrGenerator.js";
import { authGuard } from "@qr/common";

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
      description: "Generate a new QR code",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["targetUrl"],
        properties: {
          targetUrl: { type: "string", format: "uri", description: "Target URL for the QR code" },
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
      },
    },
    prehandler: [authGuard]
  }, async (req: any, res: any) => {
    const producerInstance = await getProducer();
    const id = randomUUID();
    const { targetUrl } = req.body;
    const user = (req as any).user;
    const created_by = user ? user.id : null;

    if (!targetUrl || typeof targetUrl !== "string") {
      return res.code(400).send({ error: "Invalid targetUrl" });
    }   

    // save
    await db.insert(qrs).values({
      qrId: id,
      targetUrl,
      createdBy: created_by,
    });

    // emit event
    await producerInstance.send({
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
    });

    res.code(201).send({ qrId: id, targetUrl });
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
    prehandler: [authGuard]
  }, async (req: any, res: any) => {
    const { qrId } = req.params;
    const user = (req as any).user;


    const record = await db
      .select()
      .from(qrs)
      .where(eq(qrs.qrId, qrId))
      .limit(1);

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

    // Generate PNG
    const png = await generateQrPng(records[0].targetUrl);

    // Cache 24 hours
    await cache.set(cacheKey, png.toString("base64"), {
      EX: 60 * 60 * 24,
    });

    res.type("image/png").send(png);
  });
}
