/**
 * MICROSITE BUTTON CLICK TRACKING & REDIRECT ROUTE
 * ==================================================
 * 
 * PURPOSE:
 * Handles clicks on Call-to-Action (CTA) buttons within QR code microsites.
 * This route performs three critical functions:
 * 
 * 1. **Button Resolution** - Looks up the button configuration from the microsite
 * 2. **Analytics Event** - Sends click event to Kafka for business intelligence
 * 3. **Smart Redirect** - Redirects user to the actual destination URL
 * 
 * BUSINESS VALUE:
 * - **Conversion Tracking** - Know which CTAs drive the most clicks
 * - **A/B Testing** - Compare performance of different button text/URLs
 * - **ROI Measurement** - Connect QR scans → button clicks → conversions
 * - **User Journey** - Understand path from scan to action
 * 
 * EXAMPLE FLOW:
 * 1. User scans QR code → views microsite
 * 2. User clicks "Visit Website" button
 * 3. GET /click/qr123/btn456
 * 4. System looks up button URL from database
 * 5. System sends analytics event to Kafka
 * 6. System redirects user to https://example.com
 * 
 * ANALYTICS EVENT SCHEMA:
 * {
 *   eventType: "button.clicked",
 *   qrId: "uuid-of-qr-code",
 *   buttonId: "uuid-of-button",
 *   label: "Visit Website",
 *   url: "https://example.com",
 *   timestamp: "2025-11-30T12:00:00.000Z"
 * }
 * 
 * FUTURE ENHANCEMENTS:
 * - Add device tracking (same metadata as scan events)
 * - Track click-through rate (scans vs button clicks)
 * - Add UTM parameters to destination URLs for attribution
 * - Rate limiting to prevent click fraud
 * - Support for conditional redirects (e.g., different URLs by device/location)
 */

import { createProducer, logger } from "@qr/common";
import { db } from "../db.js";
import { microsites } from "../schema.js";
import { eq } from "drizzle-orm";
import UAParser from "ua-parser-js"; // Import for future device tracking
import type { FastifyInstance } from "fastify";

export default async function clickRoutes(app: FastifyInstance) {
  // Initialize Kafka producer once when route registers
  // This producer will be reused for all click events (more efficient than creating per-request)
  const producer = await createProducer();

  /**
   * GET /click/:qrId/:buttonId
   * 
   * Track button click and redirect to destination URL.
   * 
   * PARAMETERS:
   * - qrId: UUID of the QR code (identifies which microsite)
   * - buttonId: UUID of the button (identifies which CTA was clicked)
   * 
   * RESPONSE:
   * - 302 Redirect to button's destination URL
   * - 404 if microsite or button not found
   * 
   * PERFORMANCE:
   * - ~50-100ms total (DB lookup ~30ms + Kafka send ~20ms + redirect)
   * - Kafka send is fire-and-forget, doesn't block redirect
   * 
   * SECURITY NOTE:
   * Currently allows any URL redirect. Future enhancement: validate URLs against allowlist
   * to prevent open redirect vulnerabilities (e.g., phishing via /click/:qrId/:buttonId?url=evil.com)
   */
  app.get("/click/:qrId/:buttonId", async (req: any, reply: any) => {
    const { qrId, buttonId } = req.params;

    // STEP 1: RESOLVE BUTTON CONFIGURATION
    // =====================================
    // Look up the microsite to find the button's destination URL and label
    // The "links" field is a JSONB array of button objects: [{ id, label, url }, ...]
    const site = await db.query.microsites.findFirst({
      where: eq(microsites.qrId, qrId),
    });

    // Validate microsite exists and has buttons configured
    if (!site || !site.links) {
      return reply.code(404).send({ 
        error: "Microsite or button not found",
        details: "The QR code or button configuration could not be found"
      });
    }

    // Find the specific button within the microsite's links array
    // Type assertion needed because Drizzle returns JSONB as unknown
    const btn = (site.links as any[]).find((l) => l.id === buttonId);

    // Validate button exists in the microsite configuration
    if (!btn) {
      return reply.code(404).send({ 
        error: "Button not found",
        details: `No button with ID ${buttonId} exists in this microsite`
      });
    }

    // STEP 2: SEND ANALYTICS EVENT TO KAFKA
    // ======================================
    // Fire-and-forget pattern: don't await to avoid delaying redirect
    // If Kafka is down, redirect still works (user experience > analytics)
    // 
    // FUTURE ENHANCEMENT: Add device metadata like scan events
    // const userAgent = req.headers["user-agent"] || "Unknown";
    // const parser = new UAParser(userAgent);
    // const result = parser.getResult();
    // const ip = req.headers["x-forwarded-for"] || req.ip;
    producer.send({
      topic: "analytics.events",
      messages: [
        {
          value: JSON.stringify({
            eventType: "button.clicked",    // Event type for analytics filtering
            qrId,                            // Which QR code's microsite
            buttonId: btn.id,                // Which button was clicked (for A/B testing)
            label: btn.label,                // Button text (e.g., "Visit Website", "Call Now")
            url: btn.url,                    // Destination URL
            timestamp: new Date().toISOString(), // When the click happened
            // Future: Add device metadata for cross-device analysis
            // deviceType: result.device.type || "desktop",
            // os: result.os.name,
            // browser: result.browser.name,
            // ip: ip,
            // userAgent: userAgent
          }),
        },
      ],
    }).catch((err: Error) => {
      // Log Kafka errors but don't fail the redirect
      // User experience is more important than losing one analytics event
      logger.error({ err }, "Failed to send button click event to Kafka");
    });

    // STEP 3: REDIRECT USER TO DESTINATION
    // =====================================
    // 302 redirect (temporary) is appropriate here because:
    // - The destination URL might change in the microsite config
    // - We want analytics to track every click (not cached redirects)
    // 
    // Alternative: 301 (permanent) would be cached by browsers, missing analytics
    reply.redirect(btn.url);
  });
}
