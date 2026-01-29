import { pgTable, text, timestamp, boolean, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';

/**
 * ==========================================
 * RETARGETING PIXELS TABLE
 * ==========================================
 * 
 * Enables users to add retargeting pixels to their QR microsites.
 * Retarget QR scanners with ads on Facebook, Google, TikTok, LinkedIn, etc.
 * 
 * BUSINESS VALUE:
 * - 10x ROI from retargeting campaigns
 * - Turn QR scanners into ad audiences
 * - Close the loop: QR scan → website visit → retargeting ad → conversion
 * 
 * EXAMPLE USE CASE:
 * 1. User scans restaurant menu QR code
 * 2. Facebook Pixel fires on microsite
 * 3. User added to "Menu Viewers" audience
 * 4. Restaurant runs Facebook ad: "Come back for 20% off!"
 * 5. User converts → 10x better ROI than cold traffic
 * 
 * SUPPORTED PLATFORMS:
 * - Facebook Pixel (Meta Ads)
 * - Google Ads (Global Site Tag)
 * - TikTok Pixel
 * - LinkedIn Insight Tag
 * - Twitter Pixel
 * - Snapchat Pixel
 * - Pinterest Tag
 * - Custom pixels (any JavaScript code)
 */

export const retargetingPixels = pgTable('retargeting_pixels', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Which user owns this pixel
  userId: text('user_id').notNull(),
  
  // Which QR code this pixel is attached to
  // If null, this is a global pixel for all user's QR codes
  qrId: text('qr_id'),
  
  // Platform name
  // - facebook
  // - google_ads
  // - tiktok
  // - linkedin
  // - twitter
  // - snapchat
  // - pinterest
  // - custom
  platform: varchar('platform', { length: 50 }).notNull(),
  
  // Pixel ID (e.g., Facebook Pixel ID: "1234567890")
  pixelId: varchar('pixel_id', { length: 255 }).notNull(),
  
  // Human-readable name for this pixel
  name: varchar('name', { length: 255 }).notNull(),
  
  // Optional: Additional configuration
  // For custom pixels, this contains the JavaScript code
  // For platform pixels, this can contain:
  // - Custom events to fire
  // - Conversion tracking settings
  // - Advanced matching fields
  config: jsonb('config'),
  
  // Is this pixel active?
  isActive: boolean('is_active').notNull().default(true),
  
  // When to fire the pixel
  // - page_view: Fire on every page load (default)
  // - button_click: Fire when user clicks a CTA button
  // - lead_capture: Fire when user submits a lead form
  // - custom: Fire based on custom logic
  triggerEvent: varchar('trigger_event', { length: 50 }).notNull().default('page_view'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * ==========================================
 * PIXEL FIRING LOGS TABLE
 * ==========================================
 * 
 * Tracks when pixels fire for analytics and debugging.
 * Helps verify pixels are working correctly.
 * 
 * USE CASES:
 * - "Is my Facebook Pixel firing?"
 * - "How many people were added to my retargeting audience?"
 * - "Which QR codes drive the most pixel fires?"
 */

export const pixelFireLogs = pgTable('pixel_fire_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  pixelId: uuid('pixel_id').notNull().references(() => retargetingPixels.id, { onDelete: 'cascade' }),
  
  // Which QR scan triggered this pixel
  qrId: text('qr_id').notNull(),
  
  // Session ID for deduplication
  sessionId: text('session_id'),
  
  // Event that triggered the pixel
  // - page_view, button_click, lead_capture, etc.
  eventType: varchar('event_type', { length: 50 }).notNull(),
  
  // User's device/location info
  deviceType: varchar('device_type', { length: 50 }),
  country: varchar('country', { length: 2 }),
  city: varchar('city', { length: 255 }),
  
  // Did the pixel fire successfully?
  success: boolean('success').notNull().default(true),
  
  // Error message if failed
  errorMessage: text('error_message'),
  
  firedAt: timestamp('fired_at').notNull().defaultNow(),
});

/**
 * ==========================================
 * PIXEL TEMPLATES TABLE
 * ==========================================
 * 
 * Pre-configured pixel templates for easy setup.
 * Users can pick from templates instead of manually configuring.
 * 
 * EXAMPLE TEMPLATES:
 * - "E-commerce Product View" - Fires Facebook ViewContent event
 * - "Lead Generation" - Fires Facebook Lead event
 * - "Restaurant Menu" - Custom tracking for restaurant QR codes
 * - "Event Registration" - Tracks event sign-ups
 */

export const pixelTemplates = pgTable('pixel_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Template name
  name: varchar('name', { length: 255 }).notNull(),
  
  // Template description
  description: text('description'),
  
  // Platform this template is for
  platform: varchar('platform', { length: 50 }).notNull(),
  
  // Industry/use case
  // - ecommerce, restaurant, events, real_estate, etc.
  category: varchar('category', { length: 50 }),
  
  // Pre-configured settings
  config: jsonb('config').notNull(),
  
  // Is this template available to all users?
  isPublic: boolean('is_public').notNull().default(true),
  
  // How many times this template has been used
  usageCount: text('usage_count').notNull().default('0'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
