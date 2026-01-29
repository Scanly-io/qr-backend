import { pgTable, uuid, text, timestamp, jsonb, integer, decimal, boolean, index } from "drizzle-orm/pg-core";

// Social Media Accounts - Connected platforms for posting
export const socialAccounts = pgTable("social_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(), // 'instagram', 'facebook', 'twitter', 'tiktok', 'linkedin'
  platformUserId: text("platform_user_id").notNull(),
  platformUsername: text("platform_username"),
  accessToken: text("access_token").notNull(), // Encrypted
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  profilePicture: text("profile_picture"),
  followerCount: integer("follower_count"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("social_accounts_user_idx").on(table.userId),
  platformIdx: index("social_accounts_platform_idx").on(table.platform),
}));

// Scheduled Posts - Social media planner
export const scheduledPosts = pgTable("scheduled_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  socialAccountId: uuid("social_account_id").references(() => socialAccounts.id, { onDelete: 'cascade' }),
  
  // Content
  caption: text("caption").notNull(),
  mediaUrls: jsonb("media_urls").$type<string[]>(),
  mediaType: text("media_type"), // 'image', 'video', 'carousel'
  hashtags: jsonb("hashtags").$type<string[]>(),
  
  // Scheduling
  scheduledFor: timestamp("scheduled_for").notNull(),
  timezone: text("timezone").default('UTC'),
  status: text("status").notNull().default('scheduled'), // 'scheduled', 'posted', 'failed', 'cancelled'
  
  // Posted info
  postedAt: timestamp("posted_at"),
  platformPostId: text("platform_post_id"),
  platformPostUrl: text("platform_post_url"),
  
  // Analytics (fetched after posting)
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  reach: integer("reach").default(0),
  engagement: decimal("engagement", { precision: 5, scale: 2 }),
  
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("scheduled_posts_user_idx").on(table.userId),
  statusIdx: index("scheduled_posts_status_idx").on(table.status),
  scheduledIdx: index("scheduled_posts_scheduled_idx").on(table.scheduledFor),
}));

// Auto-Reply Rules - Instagram DM automation
export const autoReplyRules = pgTable("auto_reply_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  socialAccountId: uuid("social_account_id").references(() => socialAccounts.id, { onDelete: 'cascade' }),
  
  // Trigger
  trigger: text("trigger").notNull(), // 'keyword', 'all', 'first_message'
  keywords: jsonb("keywords").$type<string[]>(),
  matchType: text("match_type").default('contains'), // 'exact', 'contains', 'starts_with'
  
  // Response
  replyMessage: text("reply_message").notNull(),
  delaySeconds: integer("delay_seconds").default(0),
  
  // Limits
  maxRepliesPerDay: integer("max_replies_per_day").default(100),
  repliesUsedToday: integer("replies_used_today").default(0),
  lastResetDate: timestamp("last_reset_date").defaultNow(),
  
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("auto_reply_rules_user_idx").on(table.userId),
  activeIdx: index("auto_reply_rules_active_idx").on(table.isActive),
}));

// Content Ideas - AI-generated post suggestions
export const contentIdeas = pgTable("content_ideas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  
  // Idea details
  title: text("title").notNull(),
  caption: text("caption").notNull(),
  hashtags: jsonb("hashtags").$type<string[]>(),
  platform: text("platform"), // Optimized for specific platform
  category: text("category"), // 'educational', 'promotional', 'engagement', 'trending'
  
  // Metadata
  niche: text("niche"),
  tone: text("tone"), // 'professional', 'casual', 'funny', 'inspirational'
  
  // User action
  status: text("status").default('new'), // 'new', 'saved', 'used', 'dismissed'
  usedInPostId: uuid("used_in_post_id").references(() => scheduledPosts.id),
  
  // Performance prediction (AI-based)
  predictedEngagement: decimal("predicted_engagement", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Trending topics expire
}, (table) => ({
  userIdx: index("content_ideas_user_idx").on(table.userId),
  statusIdx: index("content_ideas_status_idx").on(table.status),
  categoryIdx: index("content_ideas_category_idx").on(table.category),
}));

// Product Collections - Curated product groups
export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull(),
  coverImage: text("cover_image"),
  
  // Display
  displayOrder: integer("display_order").default(0),
  isPublic: boolean("is_public").default(true),
  isFeatured: boolean("is_featured").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("collections_user_idx").on(table.userId),
  slugIdx: index("collections_slug_idx").on(table.slug),
}));

// Digital Products - Courses, downloads, bookings
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  collectionId: uuid("collection_id").references(() => collections.id, { onDelete: 'set null' }),
  
  // Product details
  name: text("name").notNull(),
  description: text("description"),
  productType: text("product_type").notNull(), // 'course', 'digital_download', 'booking', 'physical'
  
  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default('USD'),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  
  // Media
  images: jsonb("images").$type<string[]>(),
  videoUrl: text("video_url"),
  
  // Digital product specifics
  downloadUrl: text("download_url"), // For digital downloads
  fileSize: text("file_size"),
  courseUrl: text("course_url"), // For courses
  lessonCount: integer("lesson_count"),
  
  // Booking specifics
  bookingDuration: integer("booking_duration"), // minutes
  bookingCalendarUrl: text("booking_calendar_url"),
  
  // Inventory
  inventory: integer("inventory"), // null = unlimited
  soldCount: integer("sold_count").default(0),
  
  // Payment
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  
  // Status
  status: text("status").default('active'), // 'active', 'draft', 'archived'
  isPublic: boolean("is_public").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("products_user_idx").on(table.userId),
  collectionIdx: index("products_collection_idx").on(table.collectionId),
  typeIdx: index("products_type_idx").on(table.productType),
  statusIdx: index("products_status_idx").on(table.status),
}));

// Orders - Purchase history
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // Seller
  customerId: text("customer_id"), // Buyer (can be null for guests)
  
  // Order details
  orderNumber: text("order_number").notNull().unique(),
  items: jsonb("items").$type<Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>>(),
  
  // Pricing
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default('0'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default('USD'),
  
  // Customer info
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  
  // Payment
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentStatus: text("payment_status").notNull(), // 'pending', 'paid', 'failed', 'refunded'
  paidAt: timestamp("paid_at"),
  
  // Fulfillment
  fulfillmentStatus: text("fulfillment_status").default('pending'), // 'pending', 'fulfilled', 'cancelled'
  fulfilledAt: timestamp("fulfilled_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("orders_user_idx").on(table.userId),
  customerIdx: index("orders_customer_idx").on(table.customerId),
  paymentStatusIdx: index("orders_payment_status_idx").on(table.paymentStatus),
}));

// Earnings - Revenue tracking
export const earnings = pgTable("earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  
  // Source
  source: text("source").notNull(), // 'product_sale', 'tip', 'booking', 'affiliate'
  sourceId: text("source_id"), // Reference to order, tip, etc.
  
  // Amount
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default('USD'),
  
  // Fees
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).default('0'),
  processingFee: decimal("processing_fee", { precision: 10, scale: 2 }).default('0'),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payout
  payoutStatus: text("payout_status").default('pending'), // 'pending', 'processing', 'paid'
  paidOutAt: timestamp("paid_out_at"),
  
  // Metadata
  description: text("description"),
  metadata: jsonb("metadata"),
  
  earnedAt: timestamp("earned_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("earnings_user_idx").on(table.userId),
  sourceIdx: index("earnings_source_idx").on(table.source),
  earnedIdx: index("earnings_earned_idx").on(table.earnedAt),
}));
