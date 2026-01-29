import { pgTable, text, timestamp, boolean, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * ==========================================
 * SUBDOMAINS TABLE (Linktree-style)
 * ==========================================
 * 
 * Free branded subdomains on platform domain (e.g., username.{SUBDOMAIN_BASE})
 * Similar to Linktree, this gives users instant branded URLs without
 * needing to own a custom domain.
 * 
 * BUSINESS VALUE:
 * - Lower barrier to entry (free branding)
 * - Professional appearance without domain cost
 * - Instant activation (no DNS configuration)
 * - Viral growth (your brand in every URL)
 * 
 * EXAMPLES (with SUBDOMAIN_BASE=scanly.io):
 * - Personal: john.scanly.io
 * - Business: acmecorp.scanly.io
 * - Brand: nike.scanly.io
 * - Event: summit2025.scanly.io
 * 
 * EXAMPLES (with SUBDOMAIN_BASE=myplatform.com):
 * - Personal: john.myplatform.com
 * - Business: acmecorp.myplatform.com
 * 
 * AVAILABILITY RULES:
 * - Must be unique across platform
 * - 3-30 characters (alphanumeric + hyphens)
 * - No profanity or trademark violations
 * - First-come-first-served
 * 
 * ROUTING:
 * - username.{SUBDOMAIN_BASE} → User's default microsite/QR
 * - username.{SUBDOMAIN_BASE}/qr1 → Specific QR code
 * - username.{SUBDOMAIN_BASE}/link/abc → Specific short link
 */

export const subdomains = pgTable('subdomains', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Which user owns this subdomain
  userId: text('user_id').notNull().unique(), // One subdomain per user
  
  // The subdomain slug (e.g., "john" in john.scanly.io)
  subdomain: varchar('subdomain', { length: 63 }).notNull().unique(),
  
  // Default QR code or microsite to show at root path
  // If null, show user's profile/dashboard page
  defaultQrId: text('default_qr_id'),
  
  // Is this subdomain active?
  isActive: boolean('is_active').notNull().default(true),
  
  // Custom metadata (theme, colors, etc.)
  metadata: text('metadata'), // JSON string for custom settings
  
  // Usage stats
  totalScans: text('total_scans').notNull().default('0'),
  lastScanAt: timestamp('last_scan_at'),
  
  // When subdomain was claimed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * ==========================================
 * SUBDOMAIN ROUTES TABLE
 * ==========================================
 * 
 * Maps paths on subdomains to specific QR codes or content.
 * Enables users to organize multiple QR codes under one subdomain.
 * 
 * EXAMPLE:
 * Subdomain: john.scanly.io
 * 
 * Routes:
 * - john.scanly.io/ → Default profile/microsite
 * - john.scanly.io/menu → QR code "restaurant-menu"
 * - john.scanly.io/wifi → QR code "wifi-credentials"
 * - john.scanly.io/contact → QR code "vcard"
 * - john.scanly.io/promo → QR code "summer-sale"
 */

export const subdomainRoutes = pgTable('subdomain_routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Which subdomain this route belongs to
  subdomainId: uuid('subdomain_id').notNull().references(() => subdomains.id, { onDelete: 'cascade' }),
  
  // Path slug (e.g., "menu", "wifi", "contact")
  // Must be unique within the subdomain
  slug: varchar('slug', { length: 100 }).notNull(),
  
  // Which QR code to route to
  qrId: text('qr_id').notNull(),
  
  // Optional: Custom title for this link
  title: varchar('title', { length: 255 }),
  
  // Optional: Description
  description: text('description'),
  
  // Is this route active?
  isActive: boolean('is_active').notNull().default(true),
  
  // Display order (for showing in user's link list)
  displayOrder: text('display_order').notNull().default('0'),
  
  // Track clicks on this specific route
  clickCount: text('click_count').notNull().default('0'),
  lastClickedAt: timestamp('last_clicked_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * ==========================================
 * CUSTOM DOMAINS TABLE
 * ==========================================
 * 
 * Enables users to map their own domains to QR codes:
 * - scan.yourbrand.com → redirects to your QR microsite
 * 
 * BUSINESS VALUE:
 * - Trust: 2x higher conversion with branded domains
 * - Branding: Consistent brand experience
 * - Tracking: Your domain = your analytics
 * 
 * DOMAIN VERIFICATION FLOW:
 * 1. User adds domain: scan.yourbrand.com
 * 2. System generates verification_token: abc123xyz
 * 3. User creates DNS records:
 *    - CNAME: scan.yourbrand.com → yourplatform.com
 *    - TXT: _qr-verify.yourbrand.com → abc123xyz
 * 4. System verifies DNS records
 * 5. Status changes: pending → verified → active
 * 6. Nginx routes requests from scan.yourbrand.com to correct QR microsite
 * 
 * EXAMPLE:
 * - Restaurant: scan.menumaster.com/promo
 * - Event: tickets.myevent.com
 * - E-commerce: shop.brand.com/sale
 */

export const customDomains = pgTable('custom_domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Which user owns this domain
  userId: text('user_id').notNull(),
  
  // Which QR code this domain points to
  // If null, this is a root domain that can handle multiple QR codes via paths
  qrId: text('qr_id'),
  
  // The custom domain (e.g., "scan.yourbrand.com")
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  
  // Verification token for DNS TXT record
  // User must create: TXT _qr-verify.yourbrand.com -> this_token
  verificationToken: varchar('verification_token', { length: 64 }).notNull(),
  
  // Verification status
  // - pending: User added domain, needs to configure DNS
  // - verifying: System is checking DNS records
  // - verified: DNS verified, ready to activate
  // - active: Domain is live and routing traffic
  // - failed: Verification failed (wrong DNS records)
  verificationStatus: varchar('verification_status', { length: 20 }).notNull().default('pending'),
  
  // SSL certificate status (for HTTPS)
  // - pending: Waiting for SSL certificate
  // - issued: Let's Encrypt certificate issued
  // - renewing: Certificate renewal in progress
  // - failed: SSL issuance failed
  sslStatus: varchar('ssl_status', { length: 20 }).notNull().default('pending'),
  
  // When SSL certificate expires (Let's Encrypt = 90 days)
  sslExpiresAt: timestamp('ssl_expires_at'),
  
  // Is this domain currently active?
  isActive: boolean('is_active').notNull().default(false),
  
  // Last time we verified DNS records
  lastVerifiedAt: timestamp('last_verified_at'),
  
  // When domain was added
  createdAt: timestamp('created_at').notNull().defaultNow(),
  
  // When domain was last updated
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * ==========================================
 * DOMAIN ROUTING RULES TABLE
 * ==========================================
 * 
 * Maps paths on custom domains to specific QR codes or microsites.
 * Enables one domain to serve multiple QR codes via different paths.
 * 
 * EXAMPLE:
 * Domain: scan.restaurant.com
 * 
 * Rules:
 * - scan.restaurant.com/lunch → QR code "menu-lunch"
 * - scan.restaurant.com/dinner → QR code "menu-dinner"
 * - scan.restaurant.com/drinks → QR code "menu-drinks"
 * - scan.restaurant.com/* → Default QR code "menu-main"
 * 
 * PATH MATCHING:
 * - Exact match: /lunch (matches only /lunch)
 * - Wildcard: /promo/* (matches /promo/summer, /promo/winter)
 * - Regex: /product/[0-9]+ (matches /product/123, /product/456)
 * - Default: /* (matches everything else)
 */

export const domainRoutes = pgTable('domain_routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Which custom domain this rule belongs to
  domainId: uuid('domain_id').notNull().references(() => customDomains.id, { onDelete: 'cascade' }),
  
  // Path pattern to match (e.g., "/lunch", "/promo/*", "/*")
  pathPattern: varchar('path_pattern', { length: 255 }).notNull(),
  
  // Type of pattern matching
  // - exact: Path must match exactly
  // - prefix: Path starts with pattern
  // - regex: Use regex matching
  // - wildcard: Use * for any segment
  matchType: varchar('match_type', { length: 20 }).notNull().default('exact'),
  
  // Which QR code to route to
  qrId: text('qr_id').notNull(),
  
  // Priority for matching (lower = higher priority)
  // Used when multiple rules could match
  priority: text('priority').notNull().default('100'),
  
  // Is this rule active?
  isActive: boolean('is_active').notNull().default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * ==========================================
 * DNS VERIFICATION ATTEMPTS TABLE
 * ==========================================
 * 
 * Logs all DNS verification attempts for debugging and monitoring.
 * Helps diagnose why domain verification might be failing.
 * 
 * USE CASES:
 * - "Why is my domain not verifying?" → Check logs
 * - "Did the user configure DNS correctly?" → See attempts
 * - "When was the last verification attempt?" → Monitor automation
 */

export const domainVerificationLogs = pgTable('domain_verification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  domainId: uuid('domain_id').notNull().references(() => customDomains.id, { onDelete: 'cascade' }),
  
  // Type of verification
  // - dns_cname: Checking CNAME record
  // - dns_txt: Checking TXT record for verification token
  // - ssl_challenge: Let's Encrypt HTTP-01 challenge
  verificationType: varchar('verification_type', { length: 50 }).notNull(),
  
  // Result: success, failed, timeout, pending
  result: varchar('result', { length: 20 }).notNull(),
  
  // Details: What we found (or didn't find)
  details: text('details'),
  
  // Error message if failed
  errorMessage: text('error_message'),
  
  // Timestamp of attempt
  attemptedAt: timestamp('attempted_at').notNull().defaultNow(),
});
