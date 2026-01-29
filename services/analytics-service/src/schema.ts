/**
 * ANALYTICS SERVICE - UNIFIED EVENTS TABLE SCHEMA
 * ================================================
 * 
 * PURPOSE:
 * Single table to store ALL analytics events from across the QR platform.
 * This unified approach simplifies querying, reporting, and cross-event analysis.
 * 
 * EVENT TYPES STORED:
 * 1. qr.scanned - QR code was scanned (from QR service)
 * 2. microsite.viewed - Microsite page was loaded (from Microsite service)
 * 3. button.clicked - CTA button was clicked (from Microsite service)
 * 4. lead.captured - Contact form submitted (from Microsite service - metadata only)
 * 
 * ARCHITECTURE DECISION: Why ONE table instead of multiple?
 * 
 * PROS:
 * - Simple queries across event types (e.g., "show me everything for qrId=123")
 * - Easy to add new event types (just new eventType value, no migration)
 * - Natural chronological ordering (all events in timestamp order)
 * - Enables funnel analysis (scan → view → click → lead in one query)
 * 
 * CONS (mitigated):
 * - Table can grow large → Use partitioning by timestamp (future)
 * - Mixed data types → Use jsonb rawPayload for flexibility
 * - Index bloat → Index only commonly filtered fields (qrId, eventType, timestamp)
 * 
 * PRIVACY & GDPR COMPLIANCE:
 * This table stores ONLY non-personal analytics metadata.
 * - Store: qrId, buttonId, leadId (references)
 * - NEVER store: name, email, phone, message (PII)
 * - Sensitive data lives in microsite-service with consent tracking
 * - Clear separation: Analytics = aggregate metrics, Microsite = customer data
 * 
 * SCALABILITY:
 * - Expected volume: 10K-100K events/day per customer
 * - Retention: 90 days hot, 1 year cold (archive to S3)
 * - Partitioning strategy: Monthly partitions on timestamp (future)
 * - Indexes: (qr_id, timestamp), (event_type, timestamp)
 */

import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const events = pgTable("scans", {  // Using "scans" table name until migration
  // PRIMARY KEY
  id: serial("id").primaryKey(),

  // CORE EVENT FIELDS
  qrId: text("qr_id").notNull(),           // Which QR code triggered this event
  eventType: text("event_type").notNull(), // qr.scanned | microsite.viewed | button.clicked | lead.captured
  timestamp: timestamp("timestamp").defaultNow().notNull(), // When the event occurred

  // DEVICE & BROWSER METADATA
  // Captured from User-Agent parsing (see ua-parser-js in microsite service)
  deviceType: text("device_type"),     // mobile | tablet | desktop | wearable
  deviceVendor: text("device_vendor"), // Apple | Samsung | Google | Huawei | Xiaomi | etc.
  deviceModel: text("device_model"),   // iPhone | iPad | Galaxy S24 | Pixel 9 | etc.
  os: text("os"),                      // iOS | Android | Windows | macOS | Linux
  osVersion: text("os_version"),       // 18.0 | 14.0 | 11 | 15.1 | etc.
  browser: text("browser"),            // Safari | Chrome | Firefox | Edge
  browserVersion: text("browser_version"), // 17.5 | 120.0 | 121.0 | etc.

  // GEO & USER JOURNEY
  // Geographic information (from IP lookup - future enhancement)
  country: text("country"),          // US | CA | UK | etc.
  city: text("city"),                // San Francisco | Toronto | London

  // User journey tracking
  referrer: text("referrer"),        // Where user came from (HTTP Referer header)
  sessionId: text("session_id"),     // Session identifier for multi-event tracking

  // UTM CAMPAIGN PARAMETERS
  // Marketing campaign tracking (from URL query parameters)
  utmSource: text("utm_source"),     // Campaign source: google | facebook | newsletter | qr
  utmMedium: text("utm_medium"),     // Campaign medium: cpc | email | social | organic
  utmCampaign: text("utm_campaign"), // Campaign name: summer-sale | product-launch-2024
  utmTerm: text("utm_term"),         // Paid search keywords (optional)
  utmContent: text("utm_content"),   // A/B test variant or ad creative (optional)

  // FLEXIBLE EVENT DATA
  // Stores event-specific data in JSON format
  // 
  // For qr.scanned:
  //   { userId: "uuid", metadata: { ... } }
  // 
  // For microsite.viewed:
  //   { micrositeId: "uuid", loadTime: 1234 }
  // 
  // For button.clicked:
  //   { buttonId: "uuid", label: "WhatsApp", url: "https://wa.me/123456" }
  // 
  // For lead.captured:
  //   { leadId: 42, source: "form", hasEmail: true, hasPhone: true }
  //   ⚠️ NEVER store actual PII here (name, email, phone)
  //   Only store metadata and reference ID
  rawPayload: jsonb("raw_payload"),
});

// DEPRECATED: Old 'scans' table for backward compatibility reference
// This has been replaced by the unified 'events' table above
// Migration: Rename 'scans' → 'events' and add new event types
export const scans = events; // Alias for backward compatibility during migration

