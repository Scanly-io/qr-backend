import { pgTable, uuid, text, jsonb, timestamp, boolean, varchar, integer, decimal, index } from "drizzle-orm/pg-core";

export const microsites = pgTable("microsites", {
  id: uuid("id").defaultRandom().primaryKey(),

  // QR code is optional - user can generate it later for sharing
  qrId: text("qr_id").unique(),

  // Editable fields
  title: text("title").notNull(),
  description: text("description"),
  theme: jsonb("theme"),
  links: jsonb("links"),

  // 🆕 Raw drag-and-drop structure
  layout: jsonb("layout"),

  // 🆕 Final published HTML
  publishedHtml: text("published_html"),
  
  // 🆕 PIVOT 1 & 2: Microsite type and white-labeling
  type: varchar("type", { length: 50 }).notNull().default("link-in-bio"), 
  // Types: 'link-in-bio', 'digital-sales-room', 'single-product-funnel', 'portfolio', 'event', 'restaurant-menu'
  
  agencyId: uuid("agency_id"), // If created by an agency, null for individual users
  brandingConfig: jsonb("branding_config").$type<{
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCss?: string;
    hidePoweredBy?: boolean;
  }>(),
  
  // 🆕 PIVOT 2: High-Ticket E-commerce
  ecommerceConfig: jsonb("ecommerce_config").$type<{
    productName?: string;
    productPrice?: number;
    currency?: string;
    productImages?: string[];
    productDescription?: string;
    checkoutUrl?: string; // Stripe Payment Link or custom checkout
    nicheCategory?: string; // 'solar', 'jewelry', 'furniture', 'home-upgrade'
    aeoOptimized?: boolean; // Answer Engine Optimization enabled
  }>(),
  
  // 🆕 PIVOT 1: Digital Sales Room specific fields
  salesRoomConfig: jsonb("sales_room_config").$type<{
    prospectName?: string;
    prospectEmail?: string;
    dealValue?: number;
    proposalUrl?: string;
    contractUrl?: string;
    videoUrls?: string[];
    expiresAt?: string;
    passwordProtected?: boolean;
    password?: string;
    trackingEnabled?: boolean;
  }>(),
  
  // 🆕 PIVOT 3: Advanced Link-in-Bio features
  advancedFeatures: jsonb("advanced_features").$type<{
    videoEmbeds?: Array<{
      url: string;
      provider: 'youtube' | 'vimeo' | 'loom' | 'direct';
      autoplay?: boolean;
      thumbnail?: string;
    }>;
    utmTracking?: {
      enabled: boolean;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      customParams?: Record<string, string>;
    };
    aiAssistantEnabled?: boolean; // Enable agentic AI for optimization suggestions
    mobileFirstOptimized?: boolean;
  }>(),
  
  // SEO & AEO (Answer Engine Optimization)
  seoConfig: jsonb("seo_config").$type<{
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    structuredData?: any; // JSON-LD for AEO
    speakableContent?: string[]; // Voice search optimized content
    faqSchema?: Array<{
      question: string;
      answer: string;
    }>;
  }>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
  createdBy: text("created_by"),
}, (table) => ({
  typeIdx: index("microsites_type_idx").on(table.type),
  agencyIdx: index("microsites_agency_idx").on(table.agencyId),
  qrIdx: index("microsites_qr_idx").on(table.qrId),
}));

export const micrositeVisits = pgTable("microsite_visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  micrositeId: uuid("microsite_id")
    .notNull()
    .references(() => microsites.id),
  userId: text("user_id"),
  
  // 🆕 PIVOT 3: Deep UTM/Attribution tracking
  utmParams: jsonb("utm_params").$type<{
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
    [key: string]: string | undefined;
  }>(),
  
  // Referrer and device info
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  deviceType: varchar("device_type", { length: 20 }), // 'mobile', 'tablet', 'desktop'
  
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  rawPayload: jsonb("raw_payload"),
}, (table) => ({
  micrositeIdx: index("visits_microsite_idx").on(table.micrositeId),
  timestampIdx: index("visits_timestamp_idx").on(table.timestamp),
}));

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  qrId: text("qr_id").notNull(),
  micrositeId: uuid("microsite_id")
    .notNull()
    .references(() => microsites.id),
  
  // Contact information (PII - requires consent!)
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  
  // Lead management
  status: text("status").notNull().default("new"),
  priority: text("priority").default("medium"),
  assignedTo: text("assigned_to"),
  
  // GDPR/Privacy compliance - CRITICAL!
  consentGiven: boolean("consent_given").notNull().default(false),
  consentTimestamp: timestamp("consent_timestamp"),
  consentText: text("consent_text"), // What they agreed to
  
  // Flexible data for campaign-specific fields
  customFields: jsonb("custom_fields"),
  
  // Tracking
  source: text("source"),
  
  // 🆕 PIVOT 3: Attribution tracking
  utmParams: jsonb("utm_params").$type<{
    source?: string;
    medium?: string;
    campaign?: string;
    [key: string]: string | undefined;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  micrositeIdx: index("leads_microsite_idx").on(table.micrositeId),
  emailIdx: index("leads_email_idx").on(table.email),
}));

// 🆕 PIVOT 1: Digital Sales Room Templates
export const salesRoomTemplates = pgTable("sales_room_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }), // 'proposal', 'contract', 'pitch-deck', 'case-study'
  
  // Template content
  thumbnail: text("thumbnail"),
  layout: jsonb("layout"), // Drag-drop structure
  defaultBlocks: jsonb("default_blocks").$type<Array<{
    type: string;
    props: Record<string, any>;
    order: number;
  }>>(),
  
  // Metadata
  isPublic: boolean("is_public").default(false),
  agencyId: uuid("agency_id"), // null = platform template
  
  usageCount: integer("usage_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("sales_room_templates_category_idx").on(table.category),
  agencyIdx: index("sales_room_templates_agency_idx").on(table.agencyId),
}));

// 🆕 PIVOT 2: High-Ticket E-commerce Templates
export const ecommerceTemplates = pgTable("ecommerce_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  name: text("name").notNull(),
  description: text("description"),
  niche: varchar("niche", { length: 50 }), // 'solar', 'jewelry', 'furniture', 'home-upgrade'
  
  // Template content
  thumbnail: text("thumbnail"),
  layout: jsonb("layout"),
  defaultBlocks: jsonb("default_blocks"),
  
  // AEO optimizations
  aeoConfig: jsonb("aeo_config").$type<{
    structuredDataTemplate: any; // JSON-LD template
    speakableSelectors: string[];
    faqQuestions: string[];
  }>(),
  
  // Pricing
  suggestedPriceRange: jsonb("suggested_price_range").$type<{
    min: number;
    max: number;
    currency: string;
  }>(),
  
  isPublic: boolean("is_public").default(true),
  usageCount: integer("usage_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nicheIdx: index("ecommerce_templates_niche_idx").on(table.niche),
}));

// 🆕 PIVOT 3: AI Assistant Recommendations
export const aiRecommendations = pgTable("ai_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  micrositeId: uuid("microsite_id").notNull().references(() => microsites.id),
  
  // Recommendation details
  type: varchar("type", { length: 50 }).notNull(), 
  // Types: 'button-position', 'headline-change', 'color-tweak', 'cta-text', 'add-video', 'remove-element'
  
  recommendation: jsonb("recommendation").$type<{
    elementId: string;
    currentValue: any;
    suggestedValue: any;
    reason: string;
    expectedImpact: string; // e.g., "+15% conversion rate"
    confidence: number; // 0-1
  }>(),
  
  // Metrics that triggered this
  basedOnMetrics: jsonb("based_on_metrics").$type<{
    visits: number;
    conversions: number;
    bounceRate: number;
    avgTimeOnPage: number;
    heatmapData?: any;
  }>(),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'accepted', 'rejected', 'auto-applied'
  appliedAt: timestamp("applied_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  micrositeStatusIdx: index("ai_recommendations_microsite_status_idx").on(table.micrositeId, table.status),
}));

// 🆕 PIVOT 3: Video Analytics (for native embedding)
export const videoAnalytics = pgTable("video_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  micrositeId: uuid("microsite_id").notNull().references(() => microsites.id),
  videoId: text("video_id").notNull(), // URL or embed ID
  
  // Video details
  provider: varchar("provider", { length: 20 }), // 'youtube', 'vimeo', 'loom', 'direct'
  title: text("title"),
  duration: integer("duration"), // seconds
  
  // Engagement metrics
  views: integer("views").default(0),
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }), // percentage
  avgWatchTime: integer("avg_watch_time"), // seconds
  
  // Conversion tracking
  conversionsAfterWatch: integer("conversions_after_watch").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  micrositeIdx: index("video_analytics_microsite_idx").on(table.micrositeId),
}));