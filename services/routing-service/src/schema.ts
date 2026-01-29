import { pgTable, text, timestamp, boolean, uuid, varchar, jsonb, decimal } from 'drizzle-orm/pg-core';

/**
 * ==========================================
 * LINK SCHEDULES TABLE
 * ==========================================
 * 
 * Schedule when QR codes change destinations.
 * Time-based routing for dynamic content.
 */

export const linkSchedules = pgTable('link_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  qrId: text('qr_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(), // "Lunch Menu Schedule"
  
  // Schedule configuration
  scheduleType: varchar('schedule_type', { length: 50 }).notNull(), // once, recurring, date_range
  
  // Target URL for this schedule
  targetUrl: text('target_url').notNull(),
  
  // For 'once' type
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  
  // For 'recurring' type (daily, weekly patterns)
  recurringPattern: jsonb('recurring_pattern'), // { days: ['monday', 'tuesday'], startTime: '11:00', endTime: '15:00' }
  timezone: varchar('timezone', { length: 100 }).default('UTC'), // User's timezone
  
  // Priority (higher = checked first)
  priority: text('priority').notNull().default('100'),
  
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * ==========================================
 * GEO FENCES TABLE
 * ==========================================
 * 
 * Route users based on geographic location.
 * Country/region/city-specific content.
 */

export const geoFences = pgTable('geo_fences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  qrId: text('qr_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(), // "US Customers"
  
  // Geographic matching
  fenceType: varchar('fence_type', { length: 50 }).notNull(), // country, region, city, radius
  
  // Location data
  countries: jsonb('countries'), // ['US', 'CA', 'MX']
  regions: jsonb('regions'), // ['California', 'Texas']
  cities: jsonb('cities'), // ['San Francisco', 'New York']
  
  // Radius fence (lat/lng + radius in km)
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  radiusKm: decimal('radius_km', { precision: 10, scale: 2 }),
  
  // Target URL for this fence
  targetUrl: text('target_url').notNull(),
  
  // Priority (higher = checked first)
  priority: text('priority').notNull().default('100'),
  
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * ==========================================
 * ROUTING LOGS TABLE
 * ==========================================
 * 
 * Track which routes are used and when.
 * Analytics for schedule/geo-fence performance.
 */

export const routingLogs = pgTable('routing_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  qrId: text('qr_id').notNull(),
  
  // What type of routing was applied
  routeType: varchar('route_type', { length: 50 }).notNull(), // schedule, geo_fence, default
  
  // Which rule matched
  scheduleId: uuid('schedule_id').references(() => linkSchedules.id, { onDelete: 'set null' }),
  geoFenceId: uuid('geo_fence_id').references(() => geoFences.id, { onDelete: 'set null' }),
  
  // Where the user was routed to
  targetUrl: text('target_url').notNull(),
  
  // User context
  userCountry: varchar('user_country', { length: 2 }),
  userCity: varchar('user_city', { length: 255 }),
  userTimezone: varchar('user_timezone', { length: 100 }),
  
  routedAt: timestamp('routed_at').notNull().defaultNow(),
});
