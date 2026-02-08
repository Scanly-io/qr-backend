import { verifyJWT, withDLQ, getRedisClient } from "@qr/common";
import { db } from "../db.js";
import { microsites } from "../schema.js";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { micrositeCacheKey, micrositeDataCacheKey } from "../utils/cachedKeys.js";
import { CACHE_VERSION } from "../constants.js";

// Generate a unique QR ID (e.g., "qr-a3f9c2")
function generateQrId(): string {
  return `qr-${randomBytes(4).toString('hex')}`;
}

export default async function micrositeRoutes(app: any) {

  // Create a new microsite (QR is optional)
  app.post("/", { preHandler: [verifyJWT] }, async (req: any, res: any) => {
    const user = req.user;
    const { title, description, theme, links, layout } = req.body;

    if (!title) {
      return res.code(400).send({ error: "title is required" });
    }

    const createResult = await withDLQ(
      () => db
        .insert(microsites)
        .values({
          qrId: generateQrId(),
          title,
          description: description || null,
          theme: theme || { primaryColor: "#4F46E5", fontFamily: "Inter" },
          links: links || [],
          layout: layout || null,
          createdBy: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(),
      {
        service: "microsite",
        operation: "microsite.create",
        metadata: { userId: user.id },
      }
    );

    if (!createResult.success) {
      return res.code(500).send({ error: "Failed to create microsite" });
    }

    return res.code(201).send(createResult.data[0]);
  });

  // List all microsites for the authenticated user
  app.get("/", { preHandler: [verifyJWT] }, async (req: any, res: any) => {
    const user = req.user;

    const listResult = await withDLQ(
      () => db
        .select()
        .from(microsites)
        .where(eq(microsites.createdBy, user.id))
        .orderBy(microsites.createdAt),
      {
        service: "microsite",
        operation: "microsite.list",
        metadata: { userId: user.id },
      }
    );

    if (!listResult.success) {
      return res.code(500).send({ error: "Failed to fetch microsites" });
    }

    return listResult.data;
  });

  // Get microsite by ID (primary key)
  app.get("/:micrositeId", { preHandler: [verifyJWT] } ,async (req: any, res: any) => {
    const { micrositeId } = req.params;
    const user = req.user;

    const fetchResult = await withDLQ(
      () => db
        .select()
        .from(microsites)
        .where(eq(microsites.id, micrositeId))
        .limit(1),
      {
        service: "microsite",
        operation: "microsite.get",
        metadata: { micrositeId, userId: user.id },
      }
    );

    if (!fetchResult.success) {
      return res.code(500).send({ error: "Failed to fetch microsite" });
    }

    const [site] = fetchResult.data;

    if (!site) return res.code(404).send({ message: "Microsite not found" });

    // Only enforce creator check if createdBy field exists on the record
    const createdBy = (site as any).createdBy;
    if (createdBy && createdBy !== user.id) {
      return res.code(403).send({ error: "Forbidden" });
    }

    return site;
  });

  // Get microsite by qrId (for backward compatibility and QR redirects)
  app.get("/qr/:qrId", { preHandler: [verifyJWT] } ,async (req: any, res: any) => {
    const { qrId } = req.params;
    const user = req.user;

    const fetchResult = await withDLQ(
      () => db
        .select()
        .from(microsites)
        .where(eq(microsites.qrId, qrId))
        .limit(1),
      {
        service: "microsite",
        operation: "microsite.get_by_qr",
        metadata: { qrId, userId: user.id },
      }
    );

    if (!fetchResult.success) {
      return res.code(500).send({ error: "Failed to fetch microsite" });
    }

    const [site] = fetchResult.data;

    if (!site) return res.code(404).send({ message: "Microsite not found" });

    // Only enforce creator check if createdBy field exists on the record
    const createdBy = (site as any).createdBy;
    if (createdBy && createdBy !== user.id) {
      return res.code(403).send({ error: "Forbidden" });
    }

    return site;
  });

  // Update microsite draft (layout, theme, links)
  app.put("/:micrositeId", { preHandler: [verifyJWT] }, async (req: any, res: any) => {
    const { micrositeId } = req.params;
    const updates = req.body;
    const user = req.user;
    
    const fetchResult = await withDLQ(
      () => db
        .select()
        .from(microsites)
        .where(eq(microsites.id, micrositeId))
        .limit(1),
      {
        service: "microsite",
        operation: "microsite.fetch_for_update",
        metadata: { micrositeId, userId: user.id },
      }
    );

    if (!fetchResult.success) {
      return res.code(500).send({ error: "Failed to fetch microsite" });
    }

    const [site] = fetchResult.data;

    if (!site) return res.code(404).send({ message: "Microsite not found" });

    if (site.createdBy !== user.id) {
      return res.code(403).send({ error: "Forbidden" });
    }

    const updateResult = await withDLQ(
      () => db.update(microsites)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(microsites.id, micrositeId)),
      {
        service: "microsite",
        operation: "microsite.update",
        metadata: { micrositeId, updates: Object.keys(updates) },
      }
    );

    if (!updateResult.success) {
      return res.code(500).send({ error: "Failed to update microsite" });
    }

    // 🔥 INVALIDATE CACHE after update
    try {
      const cache = await getRedisClient();
      const qrIdKey = `${micrositeCacheKey(site.qrId || '')}:${CACHE_VERSION}`;
      const uuidKey = `microsite:id:${micrositeId}:${CACHE_VERSION}`;
      const dataKey = `${micrositeDataCacheKey(site.qrId || '')}:${CACHE_VERSION}`;
      await cache.del(qrIdKey);
      await cache.del(uuidKey);
      await cache.del(dataKey);
      req.log?.info({ micrositeId, qrId: site.qrId }, "Cache invalidated after update");
    } catch (err) {
      req.log?.warn({ err, micrositeId }, "Failed to invalidate cache");
      // Don't fail the request if cache invalidation fails
    }

    return { message: "Microsite updated" };
  });

  // Delete microsite by ID
  app.delete("/:micrositeId", { preHandler: [verifyJWT] }, async (req: any, res: any) => {
    const { micrositeId } = req.params;
    const user = req.user;

    // First, verify ownership
    const fetchResult = await withDLQ(
      () => db
        .select()
        .from(microsites)
        .where(eq(microsites.id, micrositeId))
        .limit(1),
      {
        service: "microsite",
        operation: "microsite.fetch_for_delete",
        metadata: { micrositeId, userId: user.id },
      }
    );

    if (!fetchResult.success) {
      return res.code(500).send({ error: "Failed to fetch microsite" });
    }

    const [site] = fetchResult.data;

    if (!site) {
      return res.code(404).send({ error: "Microsite not found" });
    }

    if (site.createdBy !== user.id) {
      return res.code(403).send({ error: "Forbidden: You don't own this microsite" });
    }

    // Delete the microsite
    const deleteResult = await withDLQ(
      () => db
        .delete(microsites)
        .where(eq(microsites.id, micrositeId)),
      {
        service: "microsite",
        operation: "microsite.delete",
        metadata: { micrositeId, userId: user.id },
      }
    );

    if (!deleteResult.success) {
      return res.code(500).send({ error: "Failed to delete microsite" });
    }

    // 🔥 INVALIDATE CACHE after delete
    try {
      const cache = await getRedisClient();
      const qrIdKey = `${micrositeCacheKey(site.qrId || '')}:${CACHE_VERSION}`;
      const uuidKey = `microsite:id:${micrositeId}:${CACHE_VERSION}`;
      const dataKey = `${micrositeDataCacheKey(site.qrId || '')}:${CACHE_VERSION}`;
      await cache.del(qrIdKey);
      await cache.del(uuidKey);
      await cache.del(dataKey);
    } catch (err) {
      req.log?.warn({ err, micrositeId }, "Failed to invalidate cache on delete");
    }

    return res.code(200).send({ message: "Microsite deleted successfully" });
  });

  // Generate QR code for an existing microsite
  app.post("/:micrositeId/generate-qr", { preHandler: [verifyJWT] }, async (req: any, res: any) => {
    const { micrositeId } = req.params;
    const user = req.user;

    // Fetch the microsite
    const fetchResult = await withDLQ(
      () => db
        .select()
        .from(microsites)
        .where(eq(microsites.id, micrositeId))
        .limit(1),
      {
        service: "microsite",
        operation: "microsite.fetch_for_qr",
        metadata: { micrositeId, userId: user.id },
      }
    );

    if (!fetchResult.success) {
      return res.code(500).send({ error: "Failed to fetch microsite" });
    }

    const [site] = fetchResult.data;

    if (!site) {
      return res.code(404).send({ error: "Microsite not found" });
    }

    if (site.createdBy !== user.id) {
      return res.code(403).send({ error: "Forbidden: You don't own this microsite" });
    }

    // QR ID should already exist (auto-generated on creation)
    if (!site.qrId) {
      return res.code(500).send({ error: "Microsite missing qrId" });
    }

    const qrId = site.qrId;

    // Generate backend QR code image via QR service
    // The QR will encode the qrId and redirect to /public/{qrId}
    
    try {
      // Build the public URL that will render the microsite
      const publicUrl = `${process.env.PUBLIC_URL || 'http://localhost'}/public/${qrId}`;
      
      // Step 3: Build QR style from microsite theme
      const theme = site.theme as any;
      const qrStyle = theme ? {
        primaryColor: theme.primaryColor || "#000000",
        backgroundColor: "#ffffff",
        dotStyle: "rounded" as const,
        cornerSquareStyle: "extra-rounded" as const,
        cornerDotStyle: "dot" as const,
        logoSize: 0.25,
      } : undefined;
      
      // Step 4: Create QR code in QR service with the correct URL, qrId, and style
      const qrResponse = await fetch(`${process.env.QR_SERVICE_URL || 'http://qr-service:3002'}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '', // Forward user's token
        },
        body: JSON.stringify({
          qrId,
          targetUrl: publicUrl,
          style: qrStyle,
        }),
      });

      if (!qrResponse.ok) {
        const errorText = await qrResponse.text();
        throw new Error(`QR service returned ${qrResponse.status}: ${errorText}`);
      }

      const qrData = await qrResponse.json();
      
      // Use the qrId from response if provided, otherwise use our generated one
      const finalQrId = qrData.qrId || qrId;

      // Step 5: Link the qrId to this microsite in database
      const updateResult = await withDLQ(
        () => db.update(microsites)
          .set({ qrId: finalQrId, updatedAt: new Date() })
          .where(eq(microsites.id, micrositeId))
          .returning(),
        {
          service: "microsite",
          operation: "microsite.link_qr",
          metadata: { micrositeId, qrId: finalQrId },
        }
      );

      if (!updateResult.success) {
        return res.code(500).send({ error: "Failed to link QR to microsite" });
      }

      return res.code(201).send({
        message: "QR code generated successfully",
        qrId: finalQrId,
        publicUrl: `${process.env.PUBLIC_URL || 'http://localhost'}/public/${finalQrId}`,
        qrImageUrl: `/qr/qr/${finalQrId}/image`,
        shareUrl: `/m/${micrositeId}`,
      });

    } catch (error: any) {
      req.log?.error({ error: error.message }, "Failed to call QR service");
      return res.code(500).send({ error: "Failed to generate QR code: " + error.message });
    }
  });

  // Get WhatsApp share link for microsite
  app.get("/:micrositeId/whatsapp-share", { preHandler: [verifyJWT] }, async (req: any, res: any) => {
    const { micrositeId } = req.params;
    const user = req.user;

    // Fetch the microsite
    const fetchResult = await withDLQ(
      () => db
        .select()
        .from(microsites)
        .where(eq(microsites.id, micrositeId))
        .limit(1),
      {
        service: "microsite",
        operation: "microsite.fetch_for_share",
        metadata: { micrositeId, userId: user.id },
      }
    );

    if (!fetchResult.success) {
      return res.code(500).send({ error: "Failed to fetch microsite" });
    }

    const [site] = fetchResult.data;

    if (!site) {
      return res.code(404).send({ error: "Microsite not found" });
    }

    if (site.createdBy !== user.id) {
      return res.code(403).send({ error: "Forbidden: You don't own this microsite" });
    }

    const micrositeUrl = `${process.env.PUBLIC_URL || 'http://localhost'}/m/${micrositeId}`;
    const shareText = encodeURIComponent(`Check out my page: ${site.title}`);
    const whatsappUrl = `https://wa.me/?text=${shareText}%20${encodeURIComponent(micrositeUrl)}`;

    return {
      micrositeUrl,
      whatsappShareUrl: whatsappUrl,
      title: site.title,
    };
  });

  // ====================================================================
  // INTERNAL ENDPOINTS - For service-to-service calls (no auth)
  // ====================================================================
  
  // Get microsite owner info (for payment processing)
  // Used by integrations-service to look up connected Stripe account
  app.get("/internal/microsite/:micrositeId/owner", async (req: any, res: any) => {
    const { micrositeId } = req.params;

    try {
      const [site] = await db
        .select({
          id: microsites.id,
          createdBy: microsites.createdBy,
          title: microsites.title,
        })
        .from(microsites)
        .where(eq(microsites.id, micrositeId))
        .limit(1);

      if (!site) {
        return res.code(404).send({ error: "Microsite not found" });
      }

      return {
        micrositeId: site.id,
        userId: site.createdBy,
        title: site.title,
      };
    } catch (error: any) {
      req.log?.error({ error: error.message, micrositeId }, "Failed to look up microsite owner");
      return res.code(500).send({ error: "Failed to look up microsite owner" });
    }
  });

}
