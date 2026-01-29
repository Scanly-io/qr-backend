import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, decimal, varchar, index } from 'drizzle-orm/pg-core';

// AI-generated microsite designs
export const aiGenerations = pgTable('ai_generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  micrositeId: uuid('microsite_id'), // Link to microsite if saved
  
  // Input
  prompt: text('prompt'), // User's generation prompt
  brandUrl: text('brand_url'), // Social media or website URL for brand analysis
  brandName: text('brand_name'),
  industry: text('industry'),
  
  // AI Analysis Results
  brandAesthetic: jsonb('brand_aesthetic').$type<{
    colors: { primary: string; secondary: string; accent: string; palette: string[] };
    fonts: { heading: string; body: string; accent?: string };
    mood: string[]; // e.g., ['modern', 'playful', 'professional']
    visualStyle: string; // e.g., 'minimalist', 'maximalist', 'vintage'
    targetAudience: string;
  }>(),
  
  // Generated Design
  generatedHtml: text('generated_html'),
  generatedCss: text('generated_css'),
  generatedJs: text('generated_js'),
  components: jsonb('components').$type<Array<{
    type: string;
    props: Record<string, any>;
    order: number;
  }>>(),
  
  // Layout & Structure
  layout: varchar('layout', { length: 50 }), // 'single-page', 'multi-section', 'story'
  mobileFirst: boolean('mobile_first').default(true),
  
  // Metadata
  status: varchar('status', { length: 20 }).default('generating'), // 'generating', 'completed', 'failed'
  generationTime: integer('generation_time'), // milliseconds
  modelUsed: varchar('model_used', { length: 50 }), // 'gpt-4', 'claude-3', etc.
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('ai_gen_user_id_idx').on(table.userId),
  statusIdx: index('ai_gen_status_idx').on(table.status),
}));

// Accessibility scans and reports
export const accessibilityScans = pgTable('accessibility_scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  micrositeId: uuid('microsite_id').notNull(),
  userId: uuid('user_id').notNull(),
  
  // Scan Configuration
  standards: jsonb('standards').$type<string[]>().default(['WCAG-AA']), // ['WCAG-AA', 'WCAG-AAA', 'ADA', 'Section-508']
  
  // Results
  score: integer('score'), // 0-100
  issues: jsonb('issues').$type<Array<{
    type: string; // 'error', 'warning', 'notice'
    rule: string; // WCAG rule violated
    impact: string; // 'critical', 'serious', 'moderate', 'minor'
    description: string;
    element: string; // CSS selector
    suggestion: string;
    autoFixable: boolean;
  }>>(),
  
  // Compliance Status
  wcagAA: boolean('wcag_aa_compliant'),
  wcagAAA: boolean('wcag_aaa_compliant'),
  adaCompliant: boolean('ada_compliant'),
  
  // Auto-fixes Applied
  autoFixesApplied: jsonb('auto_fixes_applied').$type<Array<{
    rule: string;
    element: string;
    fix: string;
    timestamp: string;
  }>>(),
  
  // Report
  reportUrl: text('report_url'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  micrositeIdIdx: index('accessibility_microsite_id_idx').on(table.micrositeId),
}));

// Personalized CTA configurations
export const personalizedCtas = pgTable('personalized_ctas', {
  id: uuid('id').primaryKey().defaultRandom(),
  micrositeId: uuid('microsite_id').notNull(),
  userId: uuid('user_id').notNull(),
  
  name: text('name').notNull(),
  description: text('description'),
  
  // Default CTA
  defaultText: text('default_text').notNull(),
  defaultUrl: text('default_url').notNull(),
  defaultStyle: jsonb('default_style').$type<{
    backgroundColor: string;
    textColor: string;
    borderRadius: string;
    animation?: string;
  }>(),
  
  // Personalization Rules
  rules: jsonb('rules').$type<Array<{
    id: string;
    priority: number; // Higher priority = evaluated first
    conditions: Array<{
      type: 'location' | 'device' | 'time' | 'behavior' | 'referrer' | 'returning' | 'utm';
      operator: 'equals' | 'contains' | 'starts_with' | 'in' | 'not_in' | 'between';
      value: any;
    }>;
    cta: {
      text: string;
      url: string;
      style?: Record<string, any>;
    };
  }>>(),
  
  // A/B Testing
  abTestEnabled: boolean('ab_test_enabled').default(false),
  abVariants: jsonb('ab_variants').$type<Array<{
    id: string;
    name: string;
    text: string;
    url: string;
    weight: number; // 0-100, total should be 100
    style?: Record<string, any>;
  }>>(),
  
  // Performance Metrics
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  conversionRate: decimal('conversion_rate', { precision: 5, scale: 2 }),
  
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  micrositeIdIdx: index('personalized_ctas_microsite_id_idx').on(table.micrositeId),
}));

// CTA interaction tracking
export const ctaInteractions = pgTable('cta_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ctaId: uuid('cta_id').notNull(),
  micrositeId: uuid('microsite_id').notNull(),
  
  // User Context
  visitorId: text('visitor_id'), // Anonymous visitor ID
  sessionId: text('session_id'),
  
  // Interaction Details
  eventType: varchar('event_type', { length: 20 }).notNull(), // 'impression', 'click'
  variantId: text('variant_id'), // For A/B testing
  
  // Personalization Context
  ruleMatched: text('rule_matched'), // Which rule triggered this variant
  location: jsonb('location').$type<{
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }>(),
  device: jsonb('device').$type<{
    type: string; // 'mobile', 'tablet', 'desktop'
    os: string;
    browser: string;
  }>(),
  referrer: text('referrer'),
  utmParams: jsonb('utm_params').$type<Record<string, string>>(),
  
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => ({
  ctaIdIdx: index('cta_interactions_cta_id_idx').on(table.ctaId),
  timestampIdx: index('cta_interactions_timestamp_idx').on(table.timestamp),
}));

// Micro-interaction library (pre-built animations and effects)
export const microInteractions = pgTable('micro_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  name: text('name').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'scroll', 'hover', '3d', 'storytelling'
  description: text('description'),
  
  // Preview
  thumbnailUrl: text('thumbnail_url'),
  demoUrl: text('demo_url'),
  
  // Code
  htmlTemplate: text('html_template'),
  cssCode: text('css_code'),
  jsCode: text('js_code'),
  dependencies: jsonb('dependencies').$type<string[]>(), // ['gsap', 'three.js', etc.]
  
  // Configuration Options
  configurableProps: jsonb('configurable_props').$type<Array<{
    name: string;
    type: 'color' | 'number' | 'text' | 'boolean' | 'select';
    default: any;
    options?: any[];
    description: string;
  }>>(),
  
  // Metadata
  tags: jsonb('tags').$type<string[]>(),
  difficulty: varchar('difficulty', { length: 20 }), // 'beginner', 'intermediate', 'advanced'
  mobileOptimized: boolean('mobile_optimized').default(true),
  accessibilityCompliant: boolean('accessibility_compliant').default(true),
  
  // Usage Stats
  usageCount: integer('usage_count').default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  categoryIdx: index('micro_interactions_category_idx').on(table.category),
}));

// ML models and predictions
export const mlModels = pgTable('ml_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  name: text('name').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'qr-performance', 'churn', 'conversion', 'segmentation', 'compliance'
  version: text('version').notNull(),
  
  // Model Metadata
  algorithm: text('algorithm'), // 'random-forest', 'neural-network', 'regression'
  features: jsonb('features').$type<string[]>(), // Input features used
  accuracy: decimal('accuracy', { precision: 5, scale: 2 }),
  
  // Model File
  modelPath: text('model_path'), // S3 or local path
  modelArtifact: jsonb('model_artifact'), // Serialized model (Brain.js JSON, TensorFlow layers, etc.)
  
  // Metadata
  trainingDataSize: integer('training_data_size'),
  hyperparameters: jsonb('hyperparameters').$type<Record<string, any>>(),
  
  // Status
  status: varchar('status', { length: 20 }).default('training'), // 'training', 'active', 'deprecated'
  trainedAt: timestamp('trained_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ML predictions
export const mlPredictions = pgTable('ml_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: uuid('model_id').notNull(),
  
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'qr', 'microsite', 'user'
  entityId: uuid('entity_id').notNull(),
  
  // Prediction Results
  prediction: jsonb('prediction').$type<{
    value: any;
    confidence: number; // 0-1
    explanation?: string;
  }>(),
  
  // Input Data
  inputFeatures: jsonb('input_features').$type<Record<string, any>>(),
  
  // Validation (if actual outcome is known later)
  actualOutcome: jsonb('actual_outcome'),
  accuracyScore: decimal('accuracy_score', { precision: 5, scale: 2 }),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  modelIdIdx: index('ml_predictions_model_id_idx').on(table.modelId),
  entityIdx: index('ml_predictions_entity_idx').on(table.entityType, table.entityId),
}));

// Compliance rules for accessibility laws (WCAG, ADA, AODA, etc.)
export const complianceRules = pgTable('compliance_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Rule Identification
  standard: varchar('standard', { length: 50 }).notNull(), // 'WCAG-2.1', 'WCAG-2.2', 'ADA', 'AODA', 'Section-508'
  ruleId: text('rule_id').notNull(), // e.g., '1.1.1', '1.4.3', 'Title-III'
  title: text('title').notNull(),
  description: text('description').notNull(),
  
  // Rule Metadata
  level: varchar('level', { length: 10 }), // 'A', 'AA', 'AAA'
  category: text('category'), // 'Perceivable', 'Operable', 'Understandable', 'Robust'
  tags: jsonb('tags').$type<string[]>(),
  
  // Legal Context
  effectiveDate: timestamp('effective_date'), // When this rule became law
  jurisdiction: text('jurisdiction'), // 'US', 'Ontario', 'International'
  mandatory: boolean('mandatory').default(true),
  
  // Implementation Guidance
  successCriteria: text('success_criteria'),
  howToComply: text('how_to_comply'),
  commonFailures: jsonb('common_failures').$type<string[]>(),
  testingProcedure: text('testing_procedure'),
  
  // Version Control (for detecting new rules)
  version: text('version').default('1.0'),
  previousVersion: text('previous_version'),
  
  // Source Information
  sourceUrl: text('source_url'),
  scrapedAt: timestamp('scraped_at').defaultNow(),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  standardIdx: index('compliance_standard_idx').on(table.standard),
  ruleIdIdx: index('compliance_rule_id_idx').on(table.ruleId),
  effectiveDateIdx: index('compliance_effective_date_idx').on(table.effectiveDate),
}));
