import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, decimal } from 'drizzle-orm/pg-core';

// Integrations table - stores connected apps
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  
  // Integration details
  type: varchar('type', { length: 50 }).notNull(), // 'webhook', 'zapier', 'shopify', 'stripe', etc.
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Authentication
  authType: varchar('auth_type', { length: 50 }).notNull(), // 'none', 'api_key', 'oauth', 'basic'
  credentials: jsonb('credentials'), // Encrypted API keys, tokens, etc.
  
  // Configuration
  config: jsonb('config'), // Integration-specific settings
  isActive: boolean('is_active').default(true),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastSyncedAt: timestamp('last_synced_at'),
});

// Webhooks table - webhook configurations
export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  integrationId: uuid('integration_id').references(() => integrations.id),
  
  // Webhook details
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  method: varchar('method', { length: 10 }).default('POST'), // GET, POST, PUT, PATCH, DELETE
  
  // Triggers - when to fire the webhook
  triggers: jsonb('triggers').notNull(), // ['qr.scanned', 'conversion.tracked', etc.]
  filters: jsonb('filters'), // Additional conditions (e.g., only for specific QR codes)
  
  // Request configuration
  headers: jsonb('headers'), // Custom HTTP headers
  bodyTemplate: text('body_template'), // Custom body template (uses Handlebars)
  
  // Security
  secret: varchar('secret', { length: 255 }), // For HMAC signature
  
  // Retry configuration
  retryEnabled: boolean('retry_enabled').default(true),
  maxRetries: integer('max_retries').default(3),
  retryDelay: integer('retry_delay').default(300), // seconds
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastTriggeredAt: timestamp('last_triggered_at'),
});

// Webhook logs - delivery history
export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  webhookId: uuid('webhook_id').references(() => webhooks.id).notNull(),
  
  // Request details
  triggerEvent: varchar('trigger_event', { length: 100 }).notNull(),
  requestUrl: text('request_url').notNull(),
  requestMethod: varchar('request_method', { length: 10 }).notNull(),
  requestHeaders: jsonb('request_headers'),
  requestBody: jsonb('request_body'),
  
  // Response details
  responseStatus: integer('response_status'),
  responseHeaders: jsonb('response_headers'),
  responseBody: text('response_body'),
  
  // Execution
  success: boolean('success').notNull(),
  error: text('error'),
  duration: integer('duration'), // milliseconds
  
  // Retry tracking
  attempt: integer('attempt').default(1),
  nextRetryAt: timestamp('next_retry_at'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
});

// OAuth tokens - store OAuth 2.0 credentials
export const oauthTokens = pgTable('oauth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  integrationId: uuid('integration_id').references(() => integrations.id),
  
  // OAuth details
  provider: varchar('provider', { length: 50 }).notNull(), // 'shopify', 'stripe', etc.
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenType: varchar('token_type', { length: 50 }).default('Bearer'),
  
  // Token metadata
  expiresAt: timestamp('expires_at'),
  scope: varchar('scope', { length: 500 }),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Integration mappings - field mappings for data sync
export const integrationMappings = pgTable('integration_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  integrationId: uuid('integration_id').references(() => integrations.id).notNull(),
  
  // Mapping configuration
  sourceField: varchar('source_field', { length: 255 }).notNull(), // Our field
  targetField: varchar('target_field', { length: 255 }).notNull(), // External system field
  transform: varchar('transform', { length: 50 }), // 'uppercase', 'lowercase', 'date_format', etc.
  defaultValue: text('default_value'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
});

// Payments table - track all payment transactions
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Payment details
  stripeSessionId: varchar('stripe_session_id', { length: 255 }).unique(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  
  // Amounts (stored in cents)
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  
  // Status
  status: varchar('status', { length: 50 }).notNull(), // 'pending', 'completed', 'failed', 'refunded'
  paymentStatus: varchar('payment_status', { length: 50 }), // Stripe payment_status
  
  // User & metadata
  userId: uuid('user_id'), // Creator who receives payment
  micrositeId: uuid('microsite_id'),
  customerEmail: varchar('customer_email', { length: 255 }),
  
  // Items purchased
  items: jsonb('items'), // Array of purchased items
  metadata: jsonb('metadata'), // Additional metadata
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Appointments table - scheduling and booking
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // References
  micrositeId: uuid('microsite_id').notNull(),
  creatorId: uuid('creator_id').notNull(), // Person providing the service
  
  // Customer details
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 50 }),
  
  // Service details
  serviceId: varchar('service_id', { length: 100 }), // Optional service type ID
  serviceName: varchar('service_name', { length: 255 }).notNull(),
  serviceType: varchar('service_type', { length: 50 }).notNull(), // 'video', 'phone', 'location', 'zoom', 'teams'
  duration: integer('duration').notNull(), // in minutes
  price: decimal('price', { precision: 10, scale: 2 }).default('0'),
  
  // Scheduling
  appointmentDate: timestamp('appointment_date').notNull(),
  appointmentTime: varchar('appointment_time', { length: 10 }).notNull(), // "14:00" format
  timezone: varchar('timezone', { length: 100 }).default('UTC'),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('confirmed'), // 'confirmed', 'canceled', 'completed', 'no_show'
  paymentStatus: varchar('payment_status', { length: 50 }).default('not_required'), // 'not_required', 'pending', 'paid', 'refunded'
  
  // Cancellation
  canceledAt: timestamp('canceled_at'),
  canceledBy: varchar('canceled_by', { length: 50 }), // 'customer', 'creator', 'system'
  cancelReason: text('cancel_reason'),
  
  // Additional info
  notes: text('notes'), // Customer notes/special requests
  calendarType: varchar('calendar_type', { length: 50 }), // 'google', 'outlook', 'apple', 'calendly'
  meetingLink: text('meeting_link'), // Zoom/Teams/Google Meet link
  
  // Metadata
  metadata: jsonb('metadata'), // Additional data (payment intent ID, etc.)
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

