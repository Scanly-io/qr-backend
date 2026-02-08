// Database connection and schema
import { db } from "../db.js";
import { microsites } from "../schema.js";
// Drizzle ORM operator for WHERE clauses (like SQL WHERE qrId = 'abc')
import { eq } from "drizzle-orm";
// Shared utilities: Redis for caching HTML, Kafka for analytics events
import { getRedisClient, createProducer, logger } from "@qr/common";
// Helper function to generate consistent Redis cache keys
import { micrositeCacheKey, micrositeDataCacheKey } from "../utils/cachedKeys.js";
// Library to parse User-Agent strings and detect device/browser/OS
// Example: "Mozilla/5.0 (iPhone..." → { device: "mobile", os: "iOS", browser: "Safari" }
import { UAParser } from "ua-parser-js";
// MaxMind GeoIP2 for IP-to-location lookup (v6 API)
import { Reader, ReaderModel } from "@maxmind/geoip2-node";
import path from "path";
import { CACHE_VERSION } from "../constants.js";

// ═══════════════════════════════════════════════════════════
// GEOIP READER INITIALIZATION
// ═══════════════════════════════════════════════════════════
// Singleton pattern: Initialize once, reuse for all requests
// The GeoLite2-City.mmdb file contains IP → Location mappings
let geoReader: ReaderModel | null = null;

/**
 * Get or initialize the MaxMind GeoIP2 reader.
 * 
 * DATABASE LOCATION:
 * Place GeoLite2-City.mmdb in the microsite-service root directory.
 * Download from: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
 * 
 * PERFORMANCE:
 * - Local database = ~1ms lookup (vs 50-200ms for API calls)
 * - No API rate limits or costs
 * - Works offline
 * 
 * ACCURACY:
 * - Country: ~99% accurate
 * - City: ~80% accurate (varies by region)
 * 
 * UPDATE FREQUENCY:
 * MaxMind releases updated databases monthly. Update for best accuracy.
 */
async function getGeoReader(): Promise<ReaderModel | null> {
  if (!geoReader) {
    try {
      const dbPath = path.join(process.cwd(), "GeoLite2-City.mmdb");
      geoReader = await Reader.open(dbPath);
      logger.info("GeoIP2 database loaded successfully");
    } catch (err) {
      logger.warn("GeoIP2 database not found. Geo-location will be unavailable.");
      logger.warn("Download from: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data");
      logger.warn({ cwd: process.cwd() }, "Place GeoLite2-City.mmdb in working directory");
      return null;
    }
  }
  return geoReader;
}


/**
 * PUBLIC MICROSITE RENDERING ROUTE
 * 
 * This handles GET /public/:qrId - the main endpoint that users hit when they scan a QR code.
 * 
 * FLOW:
 * 1. Check Redis cache for pre-rendered HTML (fast path)
 * 2. If not cached, load from PostgreSQL database (slow path)
 * 3. Send analytics event to Kafka (track who viewed it, from what device)
 * 4. Cache the HTML in Redis for next time
 * 5. Return HTML to user's browser
 * 
 * WHY CACHING?
 * - Without cache: Every QR scan → database query (slow, expensive)
 * - With cache: First scan → database, next 1000 scans → instant from Redis
 * - Restaurant with 500 scans/day saves 499 database queries!
 */
export default async function renderRoutes(app: any) {
  // Lazy initialization: Don't connect until first request
  // This prevents connection errors at startup if Kafka/Redis are slow
  let producer: any = null;  // Kafka producer for analytics events
  let cache: any = null;     // Redis client for HTML caching

  // Helper: Get or create Kafka producer (singleton pattern)
  // Only creates connection once, then reuses it
  const getProducer = async () => {
    if (!producer) producer = await createProducer();
    return producer;
  };
  
  // Helper: Get or create Redis client (singleton pattern)
  const getCache = async () => {
    if (!cache) cache = await getRedisClient();
    return cache;
  };

  /**
   * GET /public/:qrId
   * 
   * When someone scans QR code "menu-qr", they visit: GET /public/menu-qr
   * 
   * @param {string} qrId - URL parameter (e.g., "menu-qr", "promo-123") or microsite UUID
   * @returns {HTML} - The microsite HTML page to display in browser
   */
  app.get("/public/:qrId", async (req: any, reply: any) => {
    // Extract qrId from URL (/public/menu-qr → qrId = "menu-qr")
    const { qrId } = req.params;
    
    const cacheInstance = await getCache();
    // Generate cache key with version like "microsite:menu-qr:v1"
    const cacheKey = `${micrositeCacheKey(qrId)}:${CACHE_VERSION}`;

    // ═══════════════════════════════════════════════════════════
    // STEP 1: CHECK REDIS CACHE (Fast Path - ~1-5ms)
    // ═══════════════════════════════════════════════════════════
    const cached = await cacheInstance.get(cacheKey);
    if (cached) {
      // Cache hit! HTML is already in Redis
      // Still send analytics (track every view, even cached ones)
      const producerInstance = await getProducer();
      sendAnalytics(producerInstance, qrId, req);
      
      // Tell browser this was served from cache (useful for debugging)
      reply.header("X-Cache", "HIT");
      
      // Return cached HTML immediately (super fast!)
      return reply.type("text/html").send(cached);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: LOAD FROM DATABASE (Slow Path - ~10-50ms)
    // ═══════════════════════════════════════════════════════════
    // Cache miss - need to fetch from PostgreSQL
    let siteRows: any[] = [];
    try {
      // Try to find by qrId first
      siteRows = await db.select().from(microsites).where(eq(microsites.qrId, qrId)).limit(1);
      
      // If not found, try by microsite id (UUID) as fallback
      // Only attempt UUID lookup if qrId looks like a valid UUID
      if (siteRows.length === 0 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrId)) {
        siteRows = await db.select().from(microsites).where(eq(microsites.id, qrId)).limit(1);
      }
    } catch (err: any) {
      // Database error (connection lost, table doesn't exist, etc.)
      req.log?.error({ err, qrId }, "microsite DB fetch error");
      return reply.code(500).send({ error: "Microsite DB error" });
    }
    
    const site = siteRows[0];  // Get first (and only) result
    
    // Check if microsite exists and has been published
    // site.publishedHtml is set when admin clicks "Publish" button
    if (!site || !site.publishedHtml) {
      return reply.code(404).send({ error: "Microsite not published" });
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: ANALYTICS + CACHE + SERVE
    // ═══════════════════════════════════════════════════════════
    
    // Send analytics event to Kafka (async, don't wait for it)
    // This tracks: who viewed, when, from what device/browser
    const producerInstance = await getProducer();
    sendAnalytics(producerInstance, qrId, req);
    
    // Store HTML in Redis for next time (so next scan is instant)
    // No expiration set - stays cached until manually invalidated
    await cacheInstance.set(cacheKey, site.publishedHtml);
    
    // Tell browser this was NOT from cache (first time serving this)
    reply.header("X-Cache", "MISS");
    
    // Return HTML to user's browser
    return reply.type("text/html").send(site.publishedHtml);
  });

  /**
   * GET /public/:qrId/data
   * 
   * Returns the microsite data as JSON (blocks, theme, metadata).
   * Used by the React frontend to render the microsite with the same
   * components as the editor preview — ensuring visual parity.
   * 
   * NO AUTH REQUIRED — this is public data.
   * 
   * @param {string} qrId - QR code ID or microsite UUID
   * @returns {JSON} - { id, title, description, layout, theme, links, qrId }
   */
  app.get("/public/:qrId/data", async (req: any, reply: any) => {
    const { qrId } = req.params;

    // Check Redis cache for JSON data
    const cacheInstance = await getCache();
    const cacheKey = `${micrositeDataCacheKey(qrId)}:${CACHE_VERSION}`;
    
    const cached = await cacheInstance.get(cacheKey);
    if (cached) {
      const producerInstance = await getProducer();
      sendAnalytics(producerInstance, qrId, req);
      reply.header("X-Cache", "HIT");
      return reply.type("application/json").send(cached);
    }

    // Load from database
    let siteRows: any[] = [];
    try {
      siteRows = await db.select().from(microsites).where(eq(microsites.qrId, qrId)).limit(1);
      if (siteRows.length === 0 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrId)) {
        siteRows = await db.select().from(microsites).where(eq(microsites.id, qrId)).limit(1);
      }
    } catch (err: any) {
      req.log?.error({ err, qrId }, "microsite data fetch error");
      return reply.code(500).send({ error: "Database error" });
    }

    const site = siteRows[0];
    if (!site) {
      return reply.code(404).send({ error: "Microsite not found" });
    }

    // Return the raw data the frontend needs to render
    const data = {
      id: site.id,
      title: site.title || "",
      description: site.description || "",
      layout: site.layout || [],
      theme: site.theme || {},
      links: site.links || [],
      qrId: site.qrId || qrId,
      type: site.type || "link-in-bio",
      publishedAt: site.publishedAt,
    };

    const json = JSON.stringify(data);

    // Analytics
    const producerInstance = await getProducer();
    sendAnalytics(producerInstance, qrId, req);

    // Cache for next request
    await cacheInstance.set(cacheKey, json);
    reply.header("X-Cache", "MISS");
    return reply.type("application/json").send(json);
  });

  /**
   * GET /m/:micrositeId
   * 
   * Direct access to microsite by ID (for WhatsApp, email, social media sharing)
   * Unlike /public/:qrId which requires QR scan, this allows direct URL sharing
   * 
   * @param {string} micrositeId - UUID of the microsite
   * @returns {HTML} - The microsite HTML page to display in browser
   */
  app.get("/m/:micrositeId", async (req: any, reply: any) => {
    const { micrositeId } = req.params;
    
    const cacheInstance = await getCache();
    // Use micrositeId for cache key with version (different from QR scans)
    const cacheKey = `microsite:id:${micrositeId}:${CACHE_VERSION}`;

    // Check Redis cache first
    const cached = await cacheInstance.get(cacheKey);
    if (cached) {
      const producerInstance = await getProducer();
      // Track as direct share (not QR scan)
      sendDirectShareAnalytics(producerInstance, micrositeId, req);
      
      reply.header("X-Cache", "HIT");
      return reply.type("text/html").send(cached);
    }

    // Load from database by micrositeId
    let siteRows: any[] = [];
    try {
      siteRows = await db.select().from(microsites).where(eq(microsites.id, micrositeId)).limit(1);
    } catch (err: any) {
      req.log?.error({ err, micrositeId }, "microsite DB fetch error");
      return reply.code(500).send({ error: "Microsite DB error" });
    }
    
    const site = siteRows[0];
    
    if (!site || !site.publishedHtml) {
      return reply.code(404).send({ error: "Microsite not published" });
    }

    // Send analytics for direct share
    const producerInstance = await getProducer();
    sendDirectShareAnalytics(producerInstance, micrositeId, req);
    
    // Cache for future direct shares
    await cacheInstance.set(cacheKey, site.publishedHtml);
    
    reply.header("X-Cache", "MISS");
    return reply.type("text/html").send(site.publishedHtml);
  });
}

/**
 * ANALYTICS FOR DIRECT SHARES (WhatsApp, email, etc.)
 * Similar to QR analytics but tracks source as "direct"
 */
async function sendDirectShareAnalytics(producer: any, micrositeId: string, req: any) {
  const userAgent = req.headers["user-agent"] || "";
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  let location: any = null;
  const ip = req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.ip || req.socket?.remoteAddress;
  
  if (ip) {
    try {
      const reader = await getGeoReader();
      if (reader) {
        const response = reader.city(ip);
        location = {
          city: response.city?.names?.en,
          country: response.country?.names?.en,
          countryCode: response.country?.isoCode,
          latitude: response.location?.latitude,
          longitude: response.location?.longitude,
        };
      }
    } catch (err) {
      // GeoIP lookup failed - continue without location
    }
  }

  const event = {
    micrositeId,
    source: "direct_share",  // Different from QR scans
    timestamp: new Date().toISOString(),
    device: {
      type: result.device.type || "desktop",
      brand: result.device.vendor,
      model: result.device.model,
    },
    browser: {
      name: result.browser.name,
      version: result.browser.version,
    },
    os: {
      name: result.os.name,
      version: result.os.version,
    },
    location,
    userAgent,
    referer: req.headers.referer || req.headers.referrer,
  };

  try {
    await producer.send({
      topic: "qr.events",
      messages: [{
        value: JSON.stringify({
          type: "microsite.direct_view",
          payload: event,
        }),
      }],
    });
  } catch (err: any) {
    req.log?.warn({ err, micrositeId }, "Failed to send direct share analytics");
  }
}

/**
 * ANALYTICS EVENT SENDER
 * 
 * Sends a tracking event to Kafka whenever someone views a microsite.
 * This event is consumed by the analytics-service and stored in the database.
 * 
 * WHY SEND TO KAFKA INSTEAD OF DIRECTLY TO DATABASE?
 * - Decoupling: Microsite service doesn't need to know about analytics DB
 * - Performance: Non-blocking - don't wait for analytics DB to respond
 * - Reliability: If analytics service is down, events queue up in Kafka
 * - Scalability: Can add more analytics consumers without changing this code
 * 
 * @param {any} producer - Kafka producer instance
 * @param {string} qrId - The QR code ID being viewed
 * @param {any} req - HTTP request object (contains headers, IP, etc.)
 */
async function sendAnalytics(producer: any, qrId: string, req: any) {
  // ═══════════════════════════════════════════════════════════
  // PARSE USER-AGENT STRING
  // ═══════════════════════════════════════════════════════════
  // User-Agent is an HTTP header browsers send automatically
  // Example: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
  // It tells us: device, operating system, browser
  
  const userAgent = req.headers["user-agent"] || "";  // Get from HTTP headers, default to empty string
  
  // Create parser instance - this does the heavy lifting
  const parser = new UAParser(userAgent);
  
  // Parse the user-agent string into structured data
  // Returns object like:
  // {
  //   device: { type: "mobile", vendor: "Apple", model: "iPhone" },
  //   os: { name: "iOS", version: "15.0" },
  //   browser: { name: "Safari", version: "15.0" }
  // }
  const ua = parser.getResult();

  // ═══════════════════════════════════════════════════════════
  // EXTRACT DEVICE INFORMATION
  // ═══════════════════════════════════════════════════════════
  // ua.device provides: type, vendor, model
  // Examples:
  //   - { type: "mobile", vendor: "Apple", model: "iPhone" }
  //   - { type: "tablet", vendor: "Samsung", model: "Galaxy Tab S9" }
  //   - { type: undefined, vendor: undefined, model: undefined } → desktop
  const deviceType = ua.device.type || "desktop";
  const deviceVendor = ua.device.vendor || null;        // Apple | Samsung | Google | Huawei
  const deviceModel = ua.device.model || null;          // iPhone | iPad | Galaxy S23 | Pixel 8

  // ═══════════════════════════════════════════════════════════
  // EXTRACT OS & BROWSER VERSIONS
  // ═══════════════════════════════════════════════════════════
  const osName = ua.os.name || "unknown";
  const osVersion = ua.os.version || null;              // iOS 17.2 | Android 14 | Windows 11
  const browserName = ua.browser.name || "unknown";
  const browserVersion = ua.browser.version || null;    // Safari 17.0 | Chrome 120.0

  // ═══════════════════════════════════════════════════════════
  // EXTRACT UTM CAMPAIGN PARAMETERS
  // ═══════════════════════════════════════════════════════════
  // Marketing teams add these to track campaign performance:
  // Example URL: https://site.com?utm_source=facebook&utm_campaign=summer-sale
  const url = new URL(req.url, `http://${req.headers.host}`);
  const utmSource = url.searchParams.get('utm_source') || null;      // google | facebook | newsletter
  const utmMedium = url.searchParams.get('utm_medium') || null;      // cpc | email | social | organic
  const utmCampaign = url.searchParams.get('utm_campaign') || null;  // summer-sale | product-launch
  const utmTerm = url.searchParams.get('utm_term') || null;          // paid search keywords
  const utmContent = url.searchParams.get('utm_content') || null;    // A/B test variant

  // ═══════════════════════════════════════════════════════════
  // EXTRACT IP ADDRESS
  // ═══════════════════════════════════════════════════════════
  // IP address can come from two places:
  // 1. x-forwarded-for header (if behind a proxy/load balancer like nginx, CloudFlare)
  //    - This is the REAL client IP when using a reverse proxy
  //    - Example: "203.0.113.1, 70.41.3.18" (chain of proxies, first is client)
  // 2. req.socket.remoteAddress (direct connection, no proxy)
  //    - Example: "192.168.1.100"
  let ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;
  
  // If x-forwarded-for contains multiple IPs (proxy chain), take the first one
  // Example: "203.0.113.1, 70.41.3.18" → "203.0.113.1"
  if (ip && typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  // ═══════════════════════════════════════════════════════════
  // GEO-LOCATION LOOKUP (IP → Country/City)
  // ═══════════════════════════════════════════════════════════
  // Use MaxMind GeoIP2 database to convert IP address to geographic location
  // Example: "203.0.113.1" → { country: "United States", city: "San Francisco" }
  let country: string | null = null;
  let city: string | null = null;
  
  if (ip) {
    try {
      const reader = await getGeoReader();
      if (reader) {
        // Lookup IP in GeoLite2-City database
        // For @maxmind/geoip2-node v5.x, use reader.city(ip)
        const response = reader.city(ip);
        
        // Extract country name (English)
        // Example: "United States", "Canada", "United Kingdom"
        country = response.country?.names?.en || null;
        
        // Extract city name (English)
        // Example: "San Francisco", "Toronto", "London"
        city = response.city?.names?.en || null;
      }
    } catch (err) {
      // Lookup failed - this is normal for:
      // - Private IPs (127.0.0.1, 192.168.x.x, 10.x.x.x)
      // - Invalid IPs
      // - IPs not in database
      // Don't log error - it's expected behavior
      // Just leave country/city as null
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SEND EVENT TO KAFKA
  // ═══════════════════════════════════════════════════════════
  // Kafka topic: "analytics.events" - a stream of all analytics events
  // Analytics service subscribes to this topic and processes events
  producer.send({
    topic: "analytics.events",  // Where to send (Kafka topic name)
    messages: [                  // Array of messages (we're sending just 1)
      { 
        value: JSON.stringify({  // Message payload (must be string, so we JSON.stringify)
          eventType: "microsite.viewed",       // Event type identifier
          qrId,                                // Which QR code was scanned
          timestamp: new Date().toISOString(), // When (ISO format: "2025-11-29T10:30:00.000Z")
          metadata: {                          // Additional tracking data
            ip,                                // User's IP address (for reference)
            userAgent,                         // Full user-agent string (for detailed analysis)
            
            // Device Information (Enhanced!)
            deviceType,                        // "mobile", "tablet", or "desktop"
            deviceVendor,                      // 📱 NEW: "Apple", "Samsung", "Google"
            deviceModel,                       // 📱 NEW: "iPhone 14 Pro", "Galaxy S23"
            
            // OS Information (Enhanced!)
            os: osName,                        // Operating system: "iOS", "Android", "Windows"
            osVersion,                         // 🆕 NEW: "17.2", "14", "11"
            
            // Browser Information (Enhanced!)
            browser: browserName,              // Browser: "Safari", "Chrome", "Firefox"
            browserVersion,                    // 🆕 NEW: "17.0", "120.0"
            
            // Geographic Information
            country,                           // 🌍 Geographic country (from GeoIP)
            city,                              // 🌆 Geographic city (from GeoIP)
            
            // Campaign Tracking (NEW!)
            utmSource,                         // 📊 NEW: Campaign source
            utmMedium,                         // 📊 NEW: Campaign medium
            utmCampaign,                       // 📊 NEW: Campaign name
            utmTerm,                           // 📊 NEW: Search keywords
            utmContent,                        // 📊 NEW: A/B test variant
          }
        }) 
      }
    ]
  });
  
  // NOTE: We DON'T await this send()
  // It's fire-and-forget - we don't wait for Kafka to confirm
  // This keeps the response fast for the user
  // If Kafka is down, the event is lost (acceptable for analytics)
}
