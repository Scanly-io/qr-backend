import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

/**
 * EMAIL SERVICE SCHEMA
 * 
 * Tables:
 * 1. email_templates - Reusable email templates with Handlebars
 * 2. email_campaigns - Email campaigns (one-time or recurring)
 * 3. email_automations - Automated email sequences (drip campaigns)
 * 4. email_logs - Email delivery logs and tracking
 * 5. email_subscribers - Email list subscribers
 * 6. email_preferences - User email preferences (unsubscribe settings)
 */

// Email templates - reusable with Handlebars
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  
  // Template details
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  description: text('description'),
  
  // Template type
  type: varchar('type', { length: 50 }).notNull(), // 'transactional', 'campaign', 'automation'
  category: varchar('category', { length: 50 }), // 'welcome', 'password_reset', 'qr_created', etc.
  
  // Content
  htmlTemplate: text('html_template').notNull(), // MJML or HTML
  textTemplate: text('text_template'), // Plain text version
  
  // Variables
  variables: jsonb('variables'), // Array of variable names used in template
  
  // Design
  previewText: varchar('preview_text', { length: 255 }), // Email preview text
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Email campaigns - broadcast emails
export const emailCampaigns = pgTable('email_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  templateId: uuid('template_id').references(() => emailTemplates.id),
  
  // Campaign details
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  
  // Content
  htmlContent: text('html_content').notNull(),
  textContent: text('text_content'),
  
  // Targeting
  segmentId: uuid('segment_id'), // Target specific subscriber segment
  filters: jsonb('filters'), // Additional filtering criteria
  
  // Scheduling
  status: varchar('status', { length: 50 }).notNull().default('draft'), // 'draft', 'scheduled', 'sending', 'sent', 'paused'
  scheduledAt: timestamp('scheduled_at'),
  sentAt: timestamp('sent_at'),
  
  // Stats
  totalRecipients: integer('total_recipients').default(0),
  totalSent: integer('total_sent').default(0),
  totalDelivered: integer('total_delivered').default(0),
  totalOpened: integer('total_opened').default(0),
  totalClicked: integer('total_clicked').default(0),
  totalBounced: integer('total_bounced').default(0),
  totalUnsubscribed: integer('total_unsubscribed').default(0),
  
  // A/B Testing
  isABTest: boolean('is_ab_test').default(false),
  abTestVariant: varchar('ab_test_variant', { length: 10 }), // 'A', 'B', 'C'
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Email automations - triggered email sequences
export const emailAutomations = pgTable('email_automations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  
  // Automation details
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Trigger
  triggerEvent: varchar('trigger_event', { length: 100 }).notNull(), // 'user_signup', 'qr_created', 'qr_scanned', 'cart_abandoned'
  triggerConditions: jsonb('trigger_conditions'), // Additional conditions
  
  // Sequence configuration
  emails: jsonb('emails').notNull(), // Array of email steps with delays
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Stats
  totalTriggered: integer('total_triggered').default(0),
  totalCompleted: integer('total_completed').default(0),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Email logs - delivery tracking
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  
  // Email details
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  subject: varchar('subject', { length: 500 }).notNull(),
  
  // Source
  campaignId: uuid('campaign_id').references(() => emailCampaigns.id),
  automationId: uuid('automation_id').references(() => emailAutomations.id),
  templateId: uuid('template_id').references(() => emailTemplates.id),
  
  // Type
  type: varchar('type', { length: 50 }).notNull(), // 'transactional', 'campaign', 'automation'
  
  // Delivery status
  status: varchar('status', { length: 50 }).notNull(), // 'queued', 'sent', 'delivered', 'bounced', 'failed'
  
  // Provider details
  provider: varchar('provider', { length: 50 }).notNull(), // 'sendgrid', 'mailgun', 'smtp'
  providerId: varchar('provider_id', { length: 255 }), // Provider's message ID
  
  // Tracking
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  bouncedAt: timestamp('bounced_at'),
  
  // Error handling
  error: text('error'),
  bounceReason: varchar('bounce_reason', { length: 255 }),
  
  // Metadata
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Email subscribers - mailing list
export const emailSubscribers = pgTable('email_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // Owner of the list
  
  // Subscriber details
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  
  // Segmentation
  tags: jsonb('tags'), // Array of tags for segmentation
  customFields: jsonb('custom_fields'), // Additional data
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'unsubscribed', 'bounced', 'complained'
  
  // Source
  source: varchar('source', { length: 100 }), // 'import', 'signup_form', 'api', 'qr_scan'
  
  // Engagement
  lastOpenedAt: timestamp('last_opened_at'),
  lastClickedAt: timestamp('last_clicked_at'),
  totalOpens: integer('total_opens').default(0),
  totalClicks: integer('total_clicks').default(0),
  
  // Unsubscribe
  unsubscribedAt: timestamp('unsubscribed_at'),
  unsubscribeReason: text('unsubscribe_reason'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Email preferences - user notification settings
export const emailPreferences = pgTable('email_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  
  // Notification preferences
  marketingEmails: boolean('marketing_emails').default(true),
  transactionalEmails: boolean('transactional_emails').default(true),
  qrScanAlerts: boolean('qr_scan_alerts').default(true),
  weeklyReports: boolean('weekly_reports').default(true),
  productUpdates: boolean('product_updates').default(true),
  
  // Frequency
  digestFrequency: varchar('digest_frequency', { length: 50 }).default('daily'), // 'realtime', 'daily', 'weekly', 'never'
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
