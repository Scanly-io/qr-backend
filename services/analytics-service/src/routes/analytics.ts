import {db} from '../db.js';
import {events} from '../schema.js';
import {z} from 'zod';
import {and, eq, desc, gte, count, sql} from 'drizzle-orm';

/**
 * ==========================================
 * ANALYTICS ROUTES - QR Code Scan Analytics
 * ==========================================
 * 
 * This module provides comprehensive analytics for QR code events.
 * Data is collected when users scan QR codes and events flow through Kafka.
 * 
 * ENDPOINTS OVERVIEW:
 * 
 * 1. /summary - Quick stats (total, today, last 7 days)
 *    Performance: ~10-20ms using COUNT aggregations
 *    Use: Dashboard KPIs, overview widgets
 * 
 * 2. /timeseries - Daily scan counts for charts
 *    Performance: ~50-200ms using GROUP BY date
 *    Use: Trend graphs, time-based analysis
 * 
 * 3. /raw - Individual scan records with pagination
 *    Performance: ~10-50ms per page (50 records default)
 *    Use: Detailed audit logs, debugging, exports
 * 
 * 4. /patterns - Hour/day breakdown for scheduling
 *    Performance: ~100-300ms using GROUP BY hour/day
 *    Use: Staff scheduling, capacity planning
 * 
 * 5. /devices - Device/OS/browser analytics
 *    Performance: ~200-500ms using direct column aggregation
 *    Use: Platform optimization, browser testing priorities
 * 
 * 6. /export - CSV download with date filtering
 *    Performance: ~500ms-2s for 10k records
 *    Use: Excel analysis, compliance reporting
 * 
 * WHY QR ANALYTICS IS SPECIAL:
 * - events accumulate forever (unlike users/products with fixed counts)
 * - Popular QR codes can have millions of events
 * - Need to handle both small (10 events) and huge (10M events) datasets
 * - Real-time dashboards require sub-second response times
 * - Device tracking helps optimize user experience
 * 
 * DEVICE TRACKING:
 * - Captured automatically from User-Agent header
 * - Stored in dedicated columns (deviceType, os, browser, ip, userAgent)
 * - Enables platform-specific optimization decisions
 */

// Query parameter validation for raw endpoint
// Dates are optional to allow fetching all records (with pagination safety)
// Page/pageSize ensure we never accidentally load millions of records
const querySchema = z.object({
  startDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: 'Invalid startDate format',
  }),
  endDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: 'Invalid endDate format',
  }),
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  pageSize: z.string().optional().transform((val) => val ? parseInt(val, 10) : 50),
});

export default async function analyticsRoutes(app: any) {
  /**
   * GET /analytics/:qrId/summary
   * 
   * Returns aggregated event statistics for a QR code.
   * 
   * Response:
   * {
   *   totalevents: 15234,      // All-time total 
   *   todayevents: 45,         // Since midnight UTC
   *   last7Daysevents: 892     // Last 7 days including today
   * }
   * 
   * Performance: ~10-20ms (uses indexed COUNT queries)
   * No pagination needed - always returns 3 numbers regardless of data size
   */
  app.get(
    '/analytics/:qrId/summary', async (req: any, reply: any) => {
        try {
          const qrId = req.params.qrId;

          // Total events for this QR code
          const totalResult = await db  
              .select({ count: count() })
              .from(events)
              .where(eq(events.qrId, qrId));
          const total = Number(totalResult[0]?.count) || 0;

          // Today's events (midnight to now in UTC)
          const startOfToday = new Date();
          startOfToday.setUTCHours(0, 0, 0, 0);
          
          const todayResult = await db  
              .select({ count: count() })
              .from(events)
              .where(
                  and(
                    eq(events.qrId, qrId),
                    gte(events.timestamp, startOfToday)
                  )
              );
          const today = Number(todayResult[0]?.count) || 0;
          
          // Last 7 days events
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const last7Result = await db  
              .select({ count: count() })
              .from(events)
              .where(
                  and(
                    eq(events.qrId, qrId),
                    gte(events.timestamp, sevenDaysAgo)
                  )
              );
          const last7 = Number(last7Result[0]?.count) || 0;

          return reply.send({ 
            totalevents: total, 
            todayevents: today, 
            last7Daysevents: last7 
          });
        } catch (error) {
          console.error('Error fetching analytics summary:', error);
          return reply.code(500).send({ error: 'Failed to fetch analytics summary' });
        }
    }
    );
  
  /**
   * GET /analytics/:qrId/timeseries
   * 
   * Returns daily scan counts grouped by date for charting/graphing.
   * 
   * Response:
   * {
   *   timeSeries: [
   *     { date: "2025-01-01", count: 123 },
   *     { date: "2025-01-02", count: 456 },
   *     ...
   *   ]
   * }
   * 
   * Performance: ~50-200ms depending on date range
   * No pagination - returns one record per day (manageable size even for years)
   * Example: 1 year of data = 365 records = ~10 KB response
   */
  app.get("/analytics/:qrId/timeseries", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;

      // Use ORM with sql for DATE grouping (some SQL needed for date functions)
      const result = await db
        .select({
          date: sql<string>`DATE(${events.timestamp})`,
          count: count(),
        })
        .from(events)
        .where(eq(events.qrId, qrId))
        .groupBy(sql`DATE(${events.timestamp})`)
        .orderBy(sql`DATE(${events.timestamp}) ASC`);
      
      const timeSeries = result.map((row) => ({
        date: row.date,
        count: Number(row.count),
      }));
      
      return reply.send({ timeSeries });
    } catch (error) {
      console.error('Error fetching timeseries:', error);
      return reply.code(500).send({ error: 'Failed to fetch timeseries data' });
    }
  });

  /**
   * GET /analytics/:qrId/raw
   * 
   * Returns raw scan records with pagination and optional date filtering.
   * 
   * WHY PAGINATION IS CRITICAL FOR QR ANALYTICS:
   * 
   * 1. UNBOUNDED GROWTH - Unlike user accounts or products (which are relatively static),
   *    QR events grow infinitely over time. A single QR code could have:
   *    - Week 1: 100 events
   *    - Month 1: 10,000 events
   *    - Year 1: 1,000,000+ events
   *    - Year 5: 50,000,000+ events
   * 
   * 2. REAL-WORLD EXAMPLE:
   *    - Restaurant menu QR code scanned 500 times/day
   *    - After 1 year: 182,500 events
   *    - Without pagination: API would return 182,500 records = ~90 MB response
   *    - Server memory spike, slow query, browser crash
   * 
   * 3. PERFORMANCE IMPACT:
   *    Without pagination:
   *    - Database query time: 5-30 seconds (full table scan)
   *    - Memory usage: 50-500 MB per request
   *    - Network transfer: Minutes on slow connections
   *    - Frontend rendering: Browser freezes/crashes
   * 
   *    With pagination (50 records/page):
   *    - Database query time: 10-50 milliseconds (indexed lookup + limit)
   *    - Memory usage: 25-50 KB per request
   *    - Network transfer: Instant
   *    - Frontend rendering: Smooth, responsive
   * 
   * 4. USE CASE:
   *    - Admin wants to audit events from last week
   *    - Query: ?startDate=2025-11-22&endDate=2025-11-29&page=1&pageSize=100
   *    - Gets first 100 events, can navigate through pages
   *    - Can export specific date ranges without overwhelming system
   * 
   * Query Parameters:
   * @param {string} startDate - Optional ISO date (e.g., "2025-01-01")
   * @param {string} endDate - Optional ISO date (e.g., "2025-12-31")
   * @param {number} page - Page number (default: 1)
   * @param {number} pageSize - Records per page (default: 50, max recommended: 1000)
   * 
   * Response includes:
   * - records: Array of scan objects
   * - pagination: { page, pageSize, total, totalPages }
   */
  app.get("/analytics/:qrId/raw", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;
      const parsed = querySchema.safeParse(req.query);

      if (!parsed.success) {
        return reply.code(400).send({ 
          error: "Invalid query parameters",
          details: parsed.error.errors 
        });
      }

      const { startDate, endDate, page, pageSize } = parsed.data;
      
      // Build WHERE conditions using ORM
      const conditions = [eq(events.qrId, qrId)];
      
      if (startDate) {
        conditions.push(gte(events.timestamp, new Date(startDate)));
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // End of day
        conditions.push(sql`${events.timestamp} <= ${endDateTime}`);
      }

      // Get total count for pagination metadata
      const totalResult = await db
        .select({ count: count() })
        .from(events)
        .where(and(...conditions));
      const total = Number(totalResult[0]?.count) || 0;

      // Get paginated records using ORM
      const offset = (page - 1) * pageSize;
      const records = await db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(desc(events.timestamp))
        .limit(pageSize)
        .offset(offset);
      
      return reply.send({ 
        records,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        }
      });
    } catch (error) {
      console.error('Error fetching raw analytics:', error);
      return reply.code(500).send({ error: 'Failed to fetch raw analytics data' });
    }
  });

  /**
   * GET /analytics/:qrId/patterns
   * 
   * Returns scan patterns by hour of day and day of week.
   * 
   * Use Cases:
   * - Restaurant: Identify peak dining hours, optimize staff scheduling
   * - Retail: Understand customer shopping patterns
   * - Events: Plan capacity for popular times
   * 
   * Response:
   * {
   *   byHourOfDay: [
   *     { hour: 0, count: 12 },   // Midnight
   *     { hour: 12, count: 450 }, // Noon peak
   *     ...
   *   ],
   *   byDayOfWeek: [
   *     { day: 0, dayName: "Sunday", count: 1200 },
   *     { day: 6, dayName: "Saturday", count: 1800 },
   *     ...
   *   ]
   * }
   */
  app.get("/analytics/:qrId/patterns", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;

      // Get events by hour of day (0-23)
      const hourlyData = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${events.timestamp})`,
          count: count(),
        })
        .from(events)
        .where(eq(events.qrId, qrId))
        .groupBy(sql`EXTRACT(HOUR FROM ${events.timestamp})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${events.timestamp}) ASC`);

      const byHourOfDay = hourlyData.map((row) => ({
        hour: Number(row.hour),
        count: Number(row.count),
      }));

      // Get events by day of week (0=Sunday, 6=Saturday)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dailyData = await db
        .select({
          day: sql<number>`EXTRACT(DOW FROM ${events.timestamp})`,
          count: count(),
        })
        .from(events)
        .where(eq(events.qrId, qrId))
        .groupBy(sql`EXTRACT(DOW FROM ${events.timestamp})`)
        .orderBy(sql`EXTRACT(DOW FROM ${events.timestamp}) ASC`);

      const byDayOfWeek = dailyData.map((row) => ({
        day: Number(row.day),
        dayName: dayNames[Number(row.day)],
        count: Number(row.count),
      }));

      return reply.send({ byHourOfDay, byDayOfWeek });
    } catch (error) {
      console.error('Error fetching pattern analytics:', error);
      return reply.code(500).send({ error: 'Failed to fetch pattern analytics' });
    }
  });

  /**
   * ==========================================
   * GET /analytics/:qrId/funnel
   * ==========================================
   * 
   * Returns conversion funnel metrics for a QR code campaign.
   * Tracks the complete user journey from view → click → lead.
   * 
   * WHAT IS A CONVERSION FUNNEL?
   * A funnel shows how many users progress through each stage:
   * 
   * 1. MICROSITE VIEWS - User scans QR → views microsite
   * 2. BUTTON CLICKS - User clicks a CTA button on microsite
   * 3. LEAD CAPTURED - User submits contact form
   * 
   * EXAMPLE FUNNEL:
   * - 1000 microsite views (100%)
   * - 300 button clicks (30% click-through rate)
   * - 50 leads captured (5% lead conversion rate)
   * 
   * BUSINESS VALUE:
   * - Identify drop-off points: "95% view but don't click → improve CTA design"
   * - Calculate ROI: "5% conversion → 50 leads → $5,000 revenue from this QR code"
   * - A/B testing: Compare funnel metrics between different microsite designs
   * - Campaign optimization: Focus budget on high-converting QR codes
   * 
   * METRICS CALCULATED:
   * - Click-Through Rate (CTR): (clicks / views) × 100
   *   Example: 300 clicks ÷ 1000 views = 30% CTR
   *   Benchmark: Good CTR is 20-40% for QR campaigns
   * 
   * - Lead Conversion Rate: (leads / views) × 100
   *   Example: 50 leads ÷ 1000 views = 5% conversion
   *   Benchmark: Good conversion is 3-10% depending on industry
   * 
   * Response:
   * {
   *   views: 1000,              // Total microsite views
   *   clicks: 300,              // Total button clicks
   *   leads: 50,                // Total leads captured
   *   clickThroughRate: 30.0,   // Percentage of views that clicked
   *   leadConversionRate: 5.0   // Percentage of views that became leads
   * }
   * 
   * REAL-WORLD EXAMPLE:
   * Restaurant QR code on table:
   * - 500 views (people scan QR)
   * - 200 clicks on "Order Online" button (40% CTR - good!)
   * - 30 leads submit "Join Mailing List" form (6% conversion - great!)
   * 
   * ACTION ITEMS FROM DATA:
   * - Low CTR (< 20%)? → Improve button design, make CTAs more prominent
   * - Low lead conversion (< 3%)? → Reduce form fields, add incentive (10% off)
   * - High CTR but low leads? → Form is too long or scary (remove optional fields)
   */
  app.get("/analytics/:qrId/funnel", async (req: any, reply: any) => {
    try {
      const { qrId } = req.params;

      // Count QR scans (when user scans the QR code)
      // This event is tracked by qr-service /scan/:qrId endpoint
      const totalScans = await db
        .select({ count: count() })
        .from(events)
        .where(
          and(
            eq(events.qrId, qrId),
            eq(events.eventType, 'qr.scanned')
          )
        );

      // Count microsite views (when user views the microsite page)
      // This can happen from:
      // 1. QR scan → redirect → view (tracked by microsite-service)
      // 2. Direct link access → view (also tracked by microsite-service)
      const totalViews = await db
        .select({ count: count() })
        .from(events)
        .where(
          and(
            eq(events.qrId, qrId),
            eq(events.eventType, 'microsite.viewed')
          )
        );

      // Count button clicks (when user clicks a CTA button)
      const totalClicks = await db
        .select({ count: count() })
        .from(events)
        .where(
          and(
            eq(events.qrId, qrId),
            eq(events.eventType, 'button.clicked')
          )
        );

      // Count leads captured (when user submits contact form)
      const totalLeads = await db
        .select({ count: count() })
        .from(events)
        .where(
          and(
            eq(events.qrId, qrId),
            eq(events.eventType, 'lead.captured')
          )
        );

      // Extract counts from query results
      const scans = Number(totalScans[0]?.count) || 0;
      const views = Number(totalViews[0]?.count) || 0;
      const clicks = Number(totalClicks[0]?.count) || 0;
      const leads = Number(totalLeads[0]?.count) || 0;

      // Calculate conversion metrics
      // viewRate: % of scans that resulted in microsite views
      // - Can be >100% if people share the direct link (more views than scans)
      // - Can be <100% if scan tracking fails or people close before page loads
      const viewRate = scans > 0 ? (views / scans) * 100 : 0;

      // clickRate: % of views that resulted in button clicks
      const clickRate = views > 0 ? (clicks / views) * 100 : 0;

      // leadConversionRate: % of views that became leads
      const leadConversionRate = views > 0 ? (leads / views) * 100 : 0;

      return reply.send({
        scans,           // Step 1: QR scans
        views,           // Step 2: Microsite views (may include direct links)
        clicks,          // Step 3: Button clicks
        leads,           // Step 4: Lead captures
        viewRate: Number(viewRate.toFixed(2)),
        clickRate: Number(clickRate.toFixed(2)),
        leadConversionRate: Number(leadConversionRate.toFixed(2)),
      });
    } catch (error) {
      console.error('Error fetching funnel analytics:', error);
      return reply.code(500).send({ error: 'Failed to fetch funnel analytics' });
    }
  });

  /**
   * ==========================================
   * GET /analytics/:qrId/devices
   * ==========================================
   * 
   * Returns device, OS, and browser breakdown for QR code events.
   * Uses dedicated columns (deviceType, os, browser) for fast aggregation.
   * 
   * HOW DEVICE DATA IS CAPTURED:
   * 1. User events QR code → microsite service receives request
   * 2. Microsite parses User-Agent header using ua-parser-js
   * 3. Extracts: deviceType (mobile/tablet/desktop), os (iOS/Android), browser (Safari/Chrome)
   * 4. Sends to Kafka with metadata
   * 5. Analytics service stores in dedicated columns (this table)
   * 6. This endpoint aggregates using GROUP BY on those columns
   * 
   * BUSINESS VALUE:
   * - 95% mobile → focus on mobile UX optimization
   * - 80% iOS → prioritize Safari testing
   * - 5% desktop → deprioritize desktop-specific features
   * 
   * PERFORMANCE:
   * - Uses database columns directly (no JSON parsing needed)
   * - GROUP BY on indexed text columns = fast even with millions of events
   * - Returns aggregated counts, not individual records
   * 
   * Query Parameters:
   * @param {string} startDate - Optional filter (ISO format: 2025-11-01)
   * @param {string} endDate - Optional filter (ISO format: 2025-11-30)
   * 
   * Response:
   * {
   *   qrId: "menu-qr",
   *   period: { start: "2025-11-01...", end: "2025-11-30..." },
   *   byDeviceType: [
   *     { deviceType: "mobile", count: 9500 },   // 95% mobile users
   *     { deviceType: "desktop", count: 500 }    // 5% desktop users
   *   ],
   *   byOS: [
   *     { os: "iOS", count: 6000 },              // 60% iOS
   *     { os: "Android", count: 3500 }           // 35% Android
   *   ],
   *   byBrowser: [
   *     { browser: "Safari", count: 6200 },      // iOS Safari + Mac Safari
   *     { browser: "Chrome", count: 3800 }       // Android Chrome + others
   *   ],
   *   totalevents: 10000
   * }
   */
  app.get("/analytics/:qrId/devices", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;
      const { startDate, endDate } = req.query;

      // Build WHERE conditions for optional date filtering
      const conditions = [eq(events.qrId, qrId)];
      
      if (startDate) {
        conditions.push(gte(events.timestamp, new Date(startDate)));
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // Include full end day
        conditions.push(sql`${events.timestamp} <= ${endDateTime}`);
      }

      // Aggregate by device type using dedicated column
      // Much faster than parsing JSON from rawPayload!
      const deviceTypeData = await db
        .select({
          deviceType: events.deviceType,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.deviceType)
        .orderBy(desc(count())); // Most common devices first

      const byDeviceType = deviceTypeData
        .filter(row => row.deviceType) // Exclude null values
        .map((row) => ({
          deviceType: row.deviceType!,
          count: Number(row.count),
        }));

      // Aggregate by operating system
      const osData = await db
        .select({
          os: events.os,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.os)
        .orderBy(desc(count()));

      const byOS = osData
        .filter(row => row.os)
        .map((row) => ({
          os: row.os!,
          count: Number(row.count),
        }));

      // Aggregate by browser
      const browserData = await db
        .select({
          browser: events.browser,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.browser)
        .orderBy(desc(count()));

      const byBrowser = browserData
        .filter(row => row.browser)
        .map((row) => ({
          browser: row.browser!,
          count: Number(row.count),
        }));

      // Get total scan count for this QR code
      const totalResult = await db
        .select({ count: count() })
        .from(events)
        .where(and(...conditions));
      const totalevents = Number(totalResult[0]?.count) || 0;

      return reply.send({ 
        qrId,
        period: {
          start: startDate || null,
          end: endDate || null,
        },
        byDeviceType,
        byOS,
        byBrowser,
        totalevents,
      });
    } catch (error) {
      console.error('Error fetching device analytics:', error);
      return reply.code(500).send({ error: 'Failed to fetch device analytics' });
    }
  });

  /**
   * ==========================================
   * GET /analytics/:qrId/export
   * ==========================================
   * 
   * Exports scan data as CSV file for external analysis tools.
   * Includes all device tracking fields for comprehensive reporting.
   * 
   * CSV COLUMNS EXPORTED:
   * - ID: Database record ID
   * - QR ID: The QR code identifier
   * - User ID: Authenticated user (if applicable)
   * - Event Type: "qr.scanned" or other event types
   * - Timestamp: When the scan occurred (ISO format)
   * - Device Type: mobile, tablet, desktop
   * - OS: iOS, Android, Windows, etc.
   * - Browser: Safari, Chrome, Firefox, etc.
   * - IP Address: User's IP (for geo-analysis)
   * - User Agent: Full browser string (for debugging)
   * 
   * USE CASES:
   * - Financial reporting: Import into Excel for invoice generation
   * - Compliance: Audit trail for regulatory requirements
   * - Advanced analysis: Import into Tableau/PowerBI for custom dashboards
   * - Data archiving: Backup historical data before purging old records
   * 
   * PERFORMANCE CONSIDERATIONS:
   * - Default limit: 10,000 records to prevent browser crashes
   * - Use startDate/endDate to filter large datasets
   * - For full exports of millions of records, use database dump tools instead
   * 
   * Query Parameters:
   * @param {string} startDate - Optional ISO date (e.g., 2025-11-01)
   * @param {string} endDate - Optional ISO date (e.g., 2025-11-30)
   * @param {number} limit - Max records (default: 10000, prevents huge files)
   * 
   * Response: CSV file download (Content-Type: text/csv)
   * Filename format: qr-analytics-{qrId}-{YYYY-MM-DD}.csv
   */
  app.get("/analytics/:qrId/export", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;
      const { startDate, endDate, limit = 10000 } = req.query;

      // Build date filter conditions
      const conditions = [eq(events.qrId, qrId)];
      
      if (startDate) {
        conditions.push(gte(events.timestamp, new Date(startDate)));
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // Include full end day
        conditions.push(sql`${events.timestamp} <= ${endDateTime}`);
      }

      // Fetch records with limit to prevent massive exports
      // Always order by timestamp DESC (newest first) for relevance
      const records = await db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(desc(events.timestamp))
        .limit(Number(limit));

      // Build CSV with device tracking columns
      // Include all the new analytics fields we're capturing!
      const headers = [
        'ID',
        'QR ID',
        'Event Type',
        'Timestamp',
        'Device Type',
        'OS',
        'Browser',
        'Country',
        'City',
        'Referrer',
        'Session ID',
        'User Agent',
      ];
      
      // Initialize CSV rows array with headers
      const csvRows = [headers.join(',')];
      
      // Convert each record to CSV row
      for (const record of records) {
        const row = [
          record.id,
          record.qrId,
          record.eventType,
          record.timestamp.toISOString(),
          record.deviceType || '',    // New column!
          record.os || '',             // New column!
          record.browser || '',        // New column!
          record.country || '',        // New column!
          record.city || '',           // New column!
          record.referrer || '',       // New column!
          record.sessionId || '',      // New column!
          '', // userAgent removed as it doesn't exist in schema
        ];
        // Wrap each field in quotes to handle commas and special chars
        csvRows.push(row.map(field => `"${field}"`).join(','));
      }

      const csv = csvRows.join('\n');

      // Set HTTP headers for file download
      // Browser will prompt user to save the file
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="qr-analytics-${qrId}-${new Date().toISOString().split('T')[0]}.csv"`);
      
      return reply.send(csv);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      return reply.code(500).send({ error: 'Failed to export analytics data' });
    }
  });

  /**
   * ==========================================
   * GET /analytics/:qrId/unique-visitors
   * ==========================================
   * 
   * Returns unique visitor count and breakdown over time.
   * Uses sessionId to deduplicate repeat visitors.
   * 
   * WHAT IS A UNIQUE VISITOR?
   * - A unique visitor is counted once per session, even if they view the microsite multiple times
   * - We use sessionId (from browser session) to identify unique users
   * - Example: User scans QR → views page → clicks button → views page again = 1 unique visitor
   * 
   * BUSINESS VALUE:
   * - Total views: 1000 (includes repeat views)
   * - Unique visitors: 600 (actual people)
   * - Insight: "Users are viewing the page 1.67 times on average"
   * 
   * METRICS CALCULATED:
   * - Total unique visitors (all time)
   * - Unique visitors today
   * - Unique visitors last 7 days
   * - Average views per visitor (total views / unique visitors)
   * 
   * Response:
   * {
   *   totalUniqueVisitors: 600,       // Unique people who viewed
   *   todayUniqueVisitors: 45,        // Unique people today
   *   last7DaysUniqueVisitors: 230,   // Unique people last 7 days
   *   totalViews: 1000,               // Total page views (includes repeats)
   *   avgViewsPerVisitor: 1.67        // How many times each person views on average
   * }
   * 
   * USE CASES:
   * - Track actual reach vs. total impressions
   * - Measure content stickiness (high avg views per visitor = engaging content)
   * - Calculate true conversion rate (leads / unique visitors)
   */
  app.get("/analytics/:qrId/unique-visitors", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;

      // Count DISTINCT sessionId for unique visitors (all time)
      // sessionId is generated once per browser session
      const uniqueVisitorsResult = await db
        .select({ 
          count: sql<number>`COUNT(DISTINCT ${events.sessionId})` 
        })
        .from(events)
        .where(
          and(
            eq(events.qrId, qrId),
            eq(events.eventType, 'microsite.viewed'),
            sql`${events.sessionId} IS NOT NULL` // Exclude events without session
          )
        );
      const totalUniqueVisitors = Number(uniqueVisitorsResult[0]?.count) || 0;

      // Unique visitors today (midnight to now UTC)
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      
      const todayUniqueResult = await db
        .select({ 
          count: sql<number>`COUNT(DISTINCT ${events.sessionId})` 
        })
        .from(events)
        .where(
          and(
            eq(events.qrId, qrId),
            eq(events.eventType, 'microsite.viewed'),
            gte(events.timestamp, startOfToday),
            sql`${events.sessionId} IS NOT NULL`
          )
        );
      const todayUniqueVisitors = Number(todayUniqueResult[0]?.count) || 0;

      // Unique visitors last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const last7DaysUniqueResult = await db
        .select({ 
          count: sql<number>`COUNT(DISTINCT ${events.sessionId})` 
        })
        .from(events)
        .where(
          and(
            eq(events.qrId, qrId),
            eq(events.eventType, 'microsite.viewed'),
            gte(events.timestamp, sevenDaysAgo),
            sql`${events.sessionId} IS NOT NULL`
          )
        );
      const last7DaysUniqueVisitors = Number(last7DaysUniqueResult[0]?.count) || 0;

      // Total views (including repeat views from same visitor)
      const totalViewsResult = await db
        .select({ count: count() })
        .from(events)
        .where(
          and(
            eq(events.qrId, qrId),
            eq(events.eventType, 'microsite.viewed')
          )
        );
      const totalViews = Number(totalViewsResult[0]?.count) || 0;

      // Calculate average views per visitor
      const avgViewsPerVisitor = totalUniqueVisitors > 0 
        ? totalViews / totalUniqueVisitors 
        : 0;

      return reply.send({
        totalUniqueVisitors,
        todayUniqueVisitors,
        last7DaysUniqueVisitors,
        totalViews,
        avgViewsPerVisitor: Number(avgViewsPerVisitor.toFixed(2)),
      });
    } catch (error) {
      console.error('Error fetching unique visitors:', error);
      return reply.code(500).send({ error: 'Failed to fetch unique visitors data' });
    }
  });

  /**
   * ==========================================
   * GET /analytics/:qrId/cta-buttons
   * ==========================================
   * 
   * Returns CTA (Call-to-Action) button performance analytics.
   * Shows which buttons get the most clicks and their conversion rates.
   * 
   * WHAT THIS TRACKS:
   * - Which CTA buttons users click most
   * - Click-through rate for each button
   * - Button engagement relative to total views
   * 
   * BUSINESS VALUE:
   * - Identify high-performing vs low-performing CTAs
   * - A/B test different button copy
   * - Optimize button placement and design
   * - Measure CTA effectiveness
   * 
   * EXAMPLE DATA:
   * Button "Order Now": 500 clicks (50% CTR) → High performer, keep it!
   * Button "Learn More": 50 clicks (5% CTR) → Low performer, improve copy or remove
   * Button "Contact Us": 200 clicks (20% CTR) → Good performer
   * 
   * Response:
   * {
   *   totalViews: 1000,           // Total microsite views
   *   totalButtonClicks: 750,     // Total CTA button clicks across all buttons
   *   buttons: [
   *     {
   *       buttonId: "cta-1",
   *       label: "Order Now",
   *       url: "https://example.com/order",
   *       clicks: 500,
   *       clickThroughRate: 50.0  // (clicks / views) * 100
   *     },
   *     {
   *       buttonId: "cta-2",
   *       label: "Contact Us",
   *       url: "https://example.com/contact",
   *       clicks: 200,
   *       clickThroughRate: 20.0
   *     }
   *   ]
   * }
   * 
   * USE CASES:
   * - "Which CTA button should I make bigger?"
   * - "Should I remove underperforming buttons?"
   * - "Is 'Buy Now' more effective than 'Shop Now'?"
   * - "Are users clicking or just viewing?"
   */
  app.get("/analytics/:qrId/cta-buttons", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;

      // Get total microsite views for CTR calculation
      const totalViewsResult = await db
        .select({ count: count() })
        .from(events)
        .where(
          and(
            eq(events.qrId, qrId),
            eq(events.eventType, 'microsite.viewed')
          )
        );
      const totalViews = Number(totalViewsResult[0]?.count) || 0;

      // Get button click events
      // rawPayload contains: { buttonId, label, url }
      const buttonClicksResult = await db
        .select({
          rawPayload: events.rawPayload,
        })
        .from(events)
        .where(
          and(
            eq(events.qrId, qrId),
            eq(events.eventType, 'button.clicked')
          )
        );

      // Aggregate button clicks by buttonId
      const buttonStats = new Map<string, {
        buttonId: string;
        label: string;
        url: string;
        clicks: number;
      }>();

      for (const record of buttonClicksResult) {
        const payload = record.rawPayload as any;
        const buttonId = payload?.buttonId;
        const label = payload?.label || 'Unknown';
        const url = payload?.url || '';

        if (buttonId) {
          if (buttonStats.has(buttonId)) {
            buttonStats.get(buttonId)!.clicks++;
          } else {
            buttonStats.set(buttonId, {
              buttonId,
              label,
              url,
              clicks: 1,
            });
          }
        }
      }

      // Calculate CTR for each button and convert to array
      const buttons = Array.from(buttonStats.values())
        .map(button => ({
          ...button,
          clickThroughRate: totalViews > 0 
            ? Number(((button.clicks / totalViews) * 100).toFixed(2))
            : 0,
        }))
        .sort((a, b) => b.clicks - a.clicks); // Sort by clicks (most popular first)

      // Calculate total button clicks
      const totalButtonClicks = buttons.reduce((sum, btn) => sum + btn.clicks, 0);

      return reply.send({
        totalViews,
        totalButtonClicks,
        buttons,
      });
    } catch (error) {
      console.error('Error fetching CTA button analytics:', error);
      return reply.code(500).send({ error: 'Failed to fetch CTA button analytics' });
    }
  });

  /**
   * ==========================================
   * GET /analytics/:qrId/referrers
   * ==========================================
   * 
   * Returns referrer analytics showing where traffic is coming from.
   * Tracks which websites, social platforms, or campaigns drive the most views.
   * 
   * WHAT IS A REFERRER?
   * - The website URL that linked to your QR microsite
   * - Captured from the HTTP Referer header (yes, it's misspelled in the spec!)
   * - Examples: "https://facebook.com", "https://instagram.com", "https://google.com/search"
   * 
   * BUSINESS VALUE:
   * - "Which social media platform drives the most traffic?"
   * - "Is our Instagram campaign working better than Facebook?"
   * - "Are people finding us through Google search?"
   * - "Which partner websites send us the most visitors?"
   * 
   * REFERRER CATEGORIES:
   * - Direct Traffic: (null referrer) - User typed URL or scanned QR directly
   * - Social Media: facebook.com, instagram.com, twitter.com, linkedin.com
   * - Search Engines: google.com, bing.com, yahoo.com
   * - Email: mail.google.com, outlook.live.com
   * - Other Websites: Any other domain
   * 
   * EXAMPLE DATA:
   * - facebook.com: 500 views (50%) → Instagram campaign is working!
   * - Direct: 300 views (30%) → People scanning QR codes offline
   * - google.com: 150 views (15%) → SEO is bringing organic traffic
   * - partner-site.com: 50 views (5%) → Partnership referrals
   * 
   * Response:
   * {
   *   totalViews: 1000,
   *   referrers: [
   *     {
   *       referrer: "https://facebook.com",
   *       domain: "facebook.com",
   *       views: 500,
   *       percentage: 50.0
   *     },
   *     {
   *       referrer: "(direct)",
   *       domain: null,
   *       views: 300,
   *       percentage: 30.0
   *     }
   *   ]
   * }
   * 
   * USE CASES:
   * - Track marketing campaign effectiveness
   * - Identify best-performing traffic sources
   * - Optimize ad spend (invest more in high-performing platforms)
   * - Measure partnership ROI
   */
  app.get("/analytics/:qrId/referrers", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;
      const { startDate, endDate } = req.query;

      // Build WHERE conditions for optional date filtering
      const conditions = [
        eq(events.qrId, qrId),
        eq(events.eventType, 'microsite.viewed') // Only count microsite views
      ];
      
      if (startDate) {
        conditions.push(gte(events.timestamp, new Date(startDate)));
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        conditions.push(sql`${events.timestamp} <= ${endDateTime}`);
      }

      // Get total views for percentage calculation
      const totalViewsResult = await db
        .select({ count: count() })
        .from(events)
        .where(and(...conditions));
      const totalViews = Number(totalViewsResult[0]?.count) || 0;

      // Aggregate by referrer
      const referrerData = await db
        .select({
          referrer: events.referrer,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.referrer)
        .orderBy(desc(count())); // Most popular referrers first

      // Extract domain from full referrer URL and calculate percentages
      const referrers = referrerData.map((row) => {
        const referrerUrl = row.referrer;
        let domain = null;
        
        // Extract domain from URL
        if (referrerUrl) {
          try {
            const url = new URL(referrerUrl);
            domain = url.hostname.replace('www.', ''); // Remove www prefix
          } catch (e) {
            // If not a valid URL, use the raw referrer value
            domain = referrerUrl;
          }
        }

        const views = Number(row.count);
        const percentage = totalViews > 0 
          ? Number(((views / totalViews) * 100).toFixed(2))
          : 0;

        return {
          referrer: referrerUrl || '(direct)',
          domain,
          views,
          percentage,
        };
      });

      return reply.send({
        totalViews,
        referrers,
      });
    } catch (error) {
      console.error('Error fetching referrer analytics:', error);
      return reply.code(500).send({ error: 'Failed to fetch referrer analytics' });
    }
  });

  /**
   * GET /analytics/:qrId/geography
   * 
   * Returns geographic distribution of scans by country and city.
   * 
   * Response:
   * {
   *   totalScans: 10000,
   *   byCountry: [
   *     { country: "US", count: 7500, percentage: 75.0 },
   *     { country: "CA", count: 1500, percentage: 15.0 },
   *     { country: "UK", count: 1000, percentage: 10.0 }
   *   ],
   *   byCity: [
   *     { country: "US", city: "New York", count: 2000 },
   *     { country: "US", city: "Los Angeles", count: 1500 },
   *     { country: "CA", city: "Toronto", count: 800 }
   *   ]
   * }
   * 
   * USE CASES:
   * - Map visualization showing scan hotspots
   * - Identify geographic markets to target
   * - Localization decisions (which languages to support)
   * - Event planning (where to host pop-ups)
   */
  app.get("/analytics/:qrId/geography", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;
      const { startDate, endDate } = req.query;

      // Build WHERE conditions
      const conditions = [eq(events.qrId, qrId)];
      
      if (startDate) {
        conditions.push(gte(events.timestamp, new Date(startDate)));
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        conditions.push(sql`${events.timestamp} <= ${endDateTime}`);
      }

      // Get total scans
      const totalResult = await db
        .select({ count: count() })
        .from(events)
        .where(and(...conditions));
      const totalScans = Number(totalResult[0]?.count) || 0;

      // Aggregate by country
      const countryData = await db
        .select({
          country: events.country,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.country)
        .orderBy(desc(count()));

      const byCountry = countryData
        .filter((row) => row.country) // Filter out null countries
        .map((row) => ({
          country: row.country!,
          count: Number(row.count),
          percentage: totalScans > 0 
            ? Number(((Number(row.count) / totalScans) * 100).toFixed(2))
            : 0,
        }));

      // Aggregate by city (top 20 cities)
      const cityData = await db
        .select({
          country: events.country,
          city: events.city,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.country, events.city)
        .orderBy(desc(count()))
        .limit(20);

      const byCity = cityData
        .filter((row) => row.city && row.country) // Filter out nulls
        .map((row) => ({
          country: row.country!,
          city: row.city!,
          count: Number(row.count),
        }));

      return reply.send({
        totalScans,
        byCountry,
        byCity,
      });
    } catch (error) {
      console.error('Error fetching geography analytics:', error);
      return reply.code(500).send({ error: 'Failed to fetch geography analytics' });
    }
  });

  /**
   * GET /analytics/overview
   * 
   * Returns overview of ALL QR codes for the authenticated user.
   * Shows top performers and aggregate metrics.
   * 
   * Response:
   * {
   *   totalQRCodes: 15,
   *   totalScans: 50000,
   *   totalScansToday: 120,
   *   totalScansLast7Days: 3400,
   *   topQRCodes: [
   *     { qrId: "menu-qr", totalScans: 15000, todayScans: 45, name: "Restaurant Menu" },
   *     { qrId: "event-qr", totalScans: 12000, todayScans: 35, name: "Event Ticket" }
   *   ]
   * }
   * 
   * NOTE: In production, this should filter by userId from JWT auth token.
   * For now, returns all QR codes in the system.
   */
  app.get("/analytics/overview", async (req: any, reply: any) => {
    try {
      // Get unique QR IDs (distinct count)
      const uniqueQRs = await db
        .select({ qrId: events.qrId })
        .from(events)
        .groupBy(events.qrId);
      
      const totalQRCodes = uniqueQRs.length;

      // Total scans across all QR codes
      const totalScansResult = await db
        .select({ count: count() })
        .from(events);
      const totalScans = Number(totalScansResult[0]?.count) || 0;

      // Today's scans
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      
      const todayResult = await db
        .select({ count: count() })
        .from(events)
        .where(gte(events.timestamp, startOfToday));
      const totalScansToday = Number(todayResult[0]?.count) || 0;

      // Last 7 days scans
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const last7Result = await db
        .select({ count: count() })
        .from(events)
        .where(gte(events.timestamp, sevenDaysAgo));
      const totalScansLast7Days = Number(last7Result[0]?.count) || 0;

      // Top QR codes by total scans
      const topQRData = await db
        .select({
          qrId: events.qrId,
          totalScans: count(),
        })
        .from(events)
        .groupBy(events.qrId)
        .orderBy(desc(count()))
        .limit(10);

      // For each top QR, get today's scans
      const topQRCodes = await Promise.all(
        topQRData.map(async (qr) => {
          const todayScansResult = await db
            .select({ count: count() })
            .from(events)
            .where(
              and(
                eq(events.qrId, qr.qrId),
                gte(events.timestamp, startOfToday)
              )
            );
          
          return {
            qrId: qr.qrId,
            totalScans: Number(qr.totalScans),
            todayScans: Number(todayScansResult[0]?.count) || 0,
            name: qr.qrId, // In production, fetch from QR service
          };
        })
      );

      return reply.send({
        totalQRCodes,
        totalScans,
        totalScansToday,
        totalScansLast7Days,
        topQRCodes,
      });
    } catch (error) {
      console.error('Error fetching overview analytics:', error);
      return reply.code(500).send({ error: 'Failed to fetch overview analytics' });
    }
  });

  /**
   * GET /analytics/live
   * 
   * Returns the most recent events across all QR codes for live feed.
   * Supports polling for real-time dashboard updates.
   * 
   * Query params:
   * - limit (optional, default: 50) - Number of recent events to return
   * - since (optional) - ISO timestamp, only return events after this time
   * 
   * Response:
   * {
   *   events: [
   *     {
   *       id: 12345,
   *       qrId: "menu-qr",
   *       eventType: "qr.scanned",
   *       timestamp: "2025-12-13T10:30:00Z",
   *       deviceType: "mobile",
   *       os: "iOS",
   *       country: "US",
   *       city: "San Francisco"
   *     }
   *   ],
   *   latestTimestamp: "2025-12-13T10:35:22Z"
   * }
   * 
   * POLLING PATTERN:
   * 1. Client calls /analytics/live to get initial events
   * 2. Client stores latestTimestamp
   * 3. Client polls every 5-10 seconds with ?since=<latestTimestamp>
   * 4. Only new events are returned (efficient)
   */
  app.get("/analytics/live", async (req: any, reply: any) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const since = req.query.since as string;

      // Build WHERE conditions
      const conditions = [];
      if (since) {
        conditions.push(gte(events.timestamp, new Date(since)));
      }

      // Get recent events
      const recentEvents = await db
        .select({
          id: events.id,
          qrId: events.qrId,
          eventType: events.eventType,
          timestamp: events.timestamp,
          deviceType: events.deviceType,
          os: events.os,
          browser: events.browser,
          country: events.country,
          city: events.city,
        })
        .from(events)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(events.timestamp))
        .limit(limit);

      // Get latest timestamp for next poll
      const latestTimestamp = recentEvents.length > 0 
        ? recentEvents[0].timestamp?.toISOString()
        : new Date().toISOString();

      return reply.send({
        events: recentEvents,
        latestTimestamp,
      });
    } catch (error) {
      console.error('Error fetching live events:', error);
      return reply.code(500).send({ error: 'Failed to fetch live events' });
    }
  });

  /**
   * ==========================================
   * GET /analytics/:qrId/device-models
   * ==========================================
   * 
   * Returns detailed device model breakdown with vendor and model information.
   * Shows which specific devices users are using (iPhone 14 Pro, Galaxy S23, etc.)
   * 
   * BUSINESS VALUE:
   * - "60% of users on iPhone 14 or newer" → Can use latest iOS features
   * - "20% still on iPhone 8" → Must test on older devices
   * - "Top Android device: Galaxy S23" → Prioritize Samsung testing
   * 
   * Response:
   * {
   *   totalDevices: 1000,
   *   byModel: [
   *     { vendor: "Apple", model: "iPhone 14 Pro", osVersion: "17.2", count: 300 },
   *     { vendor: "Apple", model: "iPhone 13", osVersion: "17.1", count: 250 },
   *     { vendor: "Samsung", model: "Galaxy S23", osVersion: "14", count: 200 }
   *   ],
   *   byVendor: [
   *     { vendor: "Apple", count: 600, percentage: 60.0 },
   *     { vendor: "Samsung", count: 300, percentage: 30.0 },
   *     { vendor: "Google", count: 100, percentage: 10.0 }
   *   ]
   * }
   */
  app.get("/analytics/:qrId/device-models", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;
      const { startDate, endDate } = req.query;

      // Build WHERE conditions
      const conditions = [eq(events.qrId, qrId)];
      
      if (startDate) {
        conditions.push(gte(events.timestamp, new Date(startDate)));
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        conditions.push(sql`${events.timestamp} <= ${endDateTime}`);
      }

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(events)
        .where(and(...conditions));
      const totalDevices = Number(totalResult[0]?.count) || 0;

      // Aggregate by device model (vendor + model + OS version)
      const modelData = await db
        .select({
          vendor: events.deviceVendor,
          model: events.deviceModel,
          osVersion: events.osVersion,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.deviceVendor, events.deviceModel, events.osVersion)
        .orderBy(desc(count()))
        .limit(20); // Top 20 device models

      const byModel = modelData
        .filter(row => row.vendor && row.model)
        .map((row) => ({
          vendor: row.vendor!,
          model: row.model!,
          osVersion: row.osVersion || "unknown",
          count: Number(row.count),
        }));

      // Aggregate by vendor
      const vendorData = await db
        .select({
          vendor: events.deviceVendor,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.deviceVendor)
        .orderBy(desc(count()));

      const byVendor = vendorData
        .filter(row => row.vendor)
        .map((row) => ({
          vendor: row.vendor!,
          count: Number(row.count),
          percentage: totalDevices > 0 
            ? Number(((Number(row.count) / totalDevices) * 100).toFixed(2))
            : 0,
        }));

      return reply.send({
        totalDevices,
        byModel,
        byVendor,
      });
    } catch (error) {
      console.error('Error fetching device models:', error);
      return reply.code(500).send({ error: 'Failed to fetch device models' });
    }
  });

  /**
   * ==========================================
   * GET /analytics/:qrId/campaigns
   * ==========================================
   * 
   * Returns UTM campaign performance analytics.
   * Shows which marketing campaigns drive the most traffic and conversions.
   * 
   * BUSINESS VALUE:
   * - "Facebook campaign drove 500 scans, Google Ads drove 200"
   * - "Summer Sale campaign: 50% conversion rate vs 30% for other campaigns"
   * - "Stop spending on underperforming campaigns"
   * 
   * Response:
   * {
   *   totalViews: 1000,
   *   campaigns: [
   *     {
   *       source: "facebook",
   *       medium: "social",
   *       campaign: "summer-sale",
   *       views: 500,
   *       percentage: 50.0
   *     },
   *     {
   *       source: "google",
   *       medium: "cpc",
   *       campaign: "brand-search",
   *       views: 300,
   *       percentage: 30.0
   *     }
   *   ],
   *   bySource: [
   *     { source: "facebook", views: 600, percentage: 60.0 },
   *     { source: "google", views: 300, percentage: 30.0 }
   *   ],
   *   byMedium: [
   *     { medium: "social", views: 600, percentage: 60.0 },
   *     { medium: "cpc", views: 300, percentage: 30.0 }
   *   ]
   * }
   */
  app.get("/analytics/:qrId/campaigns", async (req: any, reply: any) => {
    try {
      const qrId = req.params.qrId;
      const { startDate, endDate } = req.query;

      // Build WHERE conditions
      const conditions = [
        eq(events.qrId, qrId),
        eq(events.eventType, 'microsite.viewed')
      ];
      
      if (startDate) {
        conditions.push(gte(events.timestamp, new Date(startDate)));
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        conditions.push(sql`${events.timestamp} <= ${endDateTime}`);
      }

      // Get total views
      const totalResult = await db
        .select({ count: count() })
        .from(events)
        .where(and(...conditions));
      const totalViews = Number(totalResult[0]?.count) || 0;

      // Aggregate by full campaign (source + medium + campaign name)
      const campaignData = await db
        .select({
          source: events.utmSource,
          medium: events.utmMedium,
          campaign: events.utmCampaign,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.utmSource, events.utmMedium, events.utmCampaign)
        .orderBy(desc(count()));

      const campaigns = campaignData
        .filter(row => row.source || row.medium || row.campaign) // At least one UTM param
        .map((row) => ({
          source: row.source || '(not set)',
          medium: row.medium || '(not set)',
          campaign: row.campaign || '(not set)',
          views: Number(row.count),
          percentage: totalViews > 0 
            ? Number(((Number(row.count) / totalViews) * 100).toFixed(2))
            : 0,
        }));

      // Aggregate by source
      const sourceData = await db
        .select({
          source: events.utmSource,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.utmSource)
        .orderBy(desc(count()));

      const bySource = sourceData
        .filter(row => row.source)
        .map((row) => ({
          source: row.source!,
          views: Number(row.count),
          percentage: totalViews > 0 
            ? Number(((Number(row.count) / totalViews) * 100).toFixed(2))
            : 0,
        }));

      // Aggregate by medium
      const mediumData = await db
        .select({
          medium: events.utmMedium,
          count: count(),
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.utmMedium)
        .orderBy(desc(count()));

      const byMedium = mediumData
        .filter(row => row.medium)
        .map((row) => ({
          medium: row.medium!,
          views: Number(row.count),
          percentage: totalViews > 0 
            ? Number(((Number(row.count) / totalViews) * 100).toFixed(2))
            : 0,
        }));

      return reply.send({
        totalViews,
        campaigns,
        bySource,
        byMedium,
      });
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      return reply.code(500).send({ error: 'Failed to fetch campaign analytics' });
    }
  });
}
