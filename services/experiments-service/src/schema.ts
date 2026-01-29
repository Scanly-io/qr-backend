import { pgTable, uuid, varchar, timestamp, text, integer, decimal, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Experiment Status Enum
 * - draft: Created but not started
 * - active: Currently running and collecting data
 * - paused: Temporarily stopped
 * - completed: Finished, winner declared
 * - archived: Historical record
 */
export const experimentStatusEnum = pgEnum('experiment_status', ['draft', 'active', 'paused', 'completed', 'archived']);

/**
 * Experiment Type Enum
 * - ab: A/B testing (2 variants)
 * - multivariate: Multiple variants
 * - split_url: URL-based testing
 */
export const experimentTypeEnum = pgEnum('experiment_type', ['ab', 'multivariate', 'split_url']);

/**
 * Goal Type Enum
 * - click: Click-through rate
 * - conversion: Conversion rate
 * - engagement: Time on page, interactions
 * - revenue: Revenue per visitor
 */
export const goalTypeEnum = pgEnum('goal_type', ['click', 'conversion', 'engagement', 'revenue']);

/**
 * Experiments Table
 * Stores A/B tests and multivariate experiments
 */
export const experiments = pgTable('experiments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // Owner of the experiment
  qrId: uuid('qr_id'), // Optional: Link to specific QR code
  
  // Experiment Details
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: experimentTypeEnum('type').default('ab').notNull(),
  status: experimentStatusEnum('status').default('draft').notNull(),
  
  // Goal Configuration
  goalType: goalTypeEnum('goal_type').default('click').notNull(),
  goalUrl: text('goal_url'), // URL for conversion tracking
  goalEventName: varchar('goal_event_name', { length: 100 }), // Custom event name
  
  // Traffic Configuration
  trafficAllocation: integer('traffic_allocation').default(100).notNull(), // % of traffic to include (0-100)
  
  // Duration
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  scheduledEndAt: timestamp('scheduled_end_at', { withTimezone: true }),
  
  // Winner Selection
  winnerVariantId: uuid('winner_variant_id'), // Reference to winning variant
  autoSelectWinner: boolean('auto_select_winner').default(true).notNull(),
  minSampleSize: integer('min_sample_size').default(100).notNull(),
  confidenceLevel: decimal('confidence_level', { precision: 5, scale: 4 }).default('0.95').notNull(),
  
  // Metadata
  tags: jsonb('tags').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Experiment Variants Table
 * Stores different versions/variations being tested
 */
export const experimentVariants = pgTable('experiment_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  experimentId: uuid('experiment_id').notNull().references(() => experiments.id, { onDelete: 'cascade' }),
  
  // Variant Details
  name: varchar('name', { length: 255 }).notNull(), // e.g., "Control", "Variant A", "Variant B"
  description: text('description'),
  isControl: boolean('is_control').default(false).notNull(), // Is this the baseline?
  
  // Traffic Split
  trafficWeight: integer('traffic_weight').default(50).notNull(), // Weight for traffic distribution (e.g., 50 = 50%)
  
  // Variant Configuration
  targetUrl: text('target_url'), // URL this variant redirects to
  changes: jsonb('changes').$type<{
    // Changes applied in this variant
    content?: string;
    styles?: Record<string, string>;
    elements?: Array<{ selector: string; changes: Record<string, any> }>;
  }>(),
  
  // Performance Metrics (updated in real-time)
  totalAssignments: integer('total_assignments').default(0).notNull(), // Users assigned to this variant
  totalConversions: integer('total_conversions').default(0).notNull(), // Successful conversions
  conversionRate: decimal('conversion_rate', { precision: 10, scale: 6 }).default('0').notNull(), // conversion/assignment ratio
  
  // Statistical Significance
  zScore: decimal('z_score', { precision: 10, scale: 6 }), // Statistical z-score
  pValue: decimal('p_value', { precision: 10, scale: 6 }), // P-value for significance
  confidenceInterval: jsonb('confidence_interval').$type<{ lower: number; upper: number }>(),
  
  // Revenue Tracking (optional)
  totalRevenue: decimal('total_revenue', { precision: 12, scale: 2 }).default('0'),
  averageRevenuePerUser: decimal('average_revenue_per_user', { precision: 10, scale: 2 }).default('0'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Variant Assignments Table
 * Tracks which users/sessions were assigned to which variants
 */
export const variantAssignments = pgTable('variant_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  experimentId: uuid('experiment_id').notNull().references(() => experiments.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => experimentVariants.id, { onDelete: 'cascade' }),
  
  // User/Session Identification
  userId: uuid('user_id'), // If user is logged in
  sessionId: varchar('session_id', { length: 255 }).notNull(), // Anonymous session tracking
  fingerprint: varchar('fingerprint', { length: 255 }), // Browser fingerprint for consistency
  
  // Assignment Details
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  
  // Conversion Tracking
  converted: boolean('converted').default(false).notNull(),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  conversionValue: decimal('conversion_value', { precision: 12, scale: 2 }), // Revenue if applicable
  
  // Context
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  country: varchar('country', { length: 2 }),
  city: varchar('city', { length: 100 }),
  referrer: text('referrer'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
});

/**
 * Experiment Results Table
 * Aggregated results and analysis for experiments
 */
export const experimentResults = pgTable('experiment_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  experimentId: uuid('experiment_id').notNull().references(() => experiments.id, { onDelete: 'cascade' }),
  
  // Overall Stats
  totalParticipants: integer('total_participants').default(0).notNull(),
  totalConversions: integer('total_conversions').default(0).notNull(),
  overallConversionRate: decimal('overall_conversion_rate', { precision: 10, scale: 6 }).default('0'),
  
  // Winner Information
  winnerVariantId: uuid('winner_variant_id'),
  winnerConfidence: decimal('winner_confidence', { precision: 5, scale: 4 }), // Confidence in winner (0-1)
  improvementOverControl: decimal('improvement_over_control', { precision: 10, scale: 4 }), // % improvement
  
  // Statistical Analysis
  statisticalSignificance: boolean('statistical_significance').default(false).notNull(),
  pValue: decimal('p_value', { precision: 10, scale: 6 }),
  chiSquareStatistic: decimal('chi_square_statistic', { precision: 12, scale: 6 }),
  degreesOfFreedom: integer('degrees_of_freedom'),
  
  // Revenue Stats
  totalRevenue: decimal('total_revenue', { precision: 12, scale: 2 }).default('0'),
  revenuePerParticipant: decimal('revenue_per_participant', { precision: 10, scale: 2 }).default('0'),
  
  // Time-based Analysis
  analysisStartedAt: timestamp('analysis_started_at', { withTimezone: true }),
  analysisCompletedAt: timestamp('analysis_completed_at', { withTimezone: true }),
  
  // Detailed Results (JSON)
  variantBreakdown: jsonb('variant_breakdown').$type<Array<{
    variantId: string;
    variantName: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    confidenceInterval: { lower: number; upper: number };
  }>>(),
  
  // Insights & Recommendations
  insights: jsonb('insights').$type<Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'success';
  }>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const experimentsRelations = relations(experiments, ({ many, one }) => ({
  variants: many(experimentVariants),
  assignments: many(variantAssignments),
  results: one(experimentResults),
}));

export const experimentVariantsRelations = relations(experimentVariants, ({ one, many }) => ({
  experiment: one(experiments, {
    fields: [experimentVariants.experimentId],
    references: [experiments.id],
  }),
  assignments: many(variantAssignments),
}));

export const variantAssignmentsRelations = relations(variantAssignments, ({ one }) => ({
  experiment: one(experiments, {
    fields: [variantAssignments.experimentId],
    references: [experiments.id],
  }),
  variant: one(experimentVariants, {
    fields: [variantAssignments.variantId],
    references: [experimentVariants.id],
  }),
}));

export const experimentResultsRelations = relations(experimentResults, ({ one }) => ({
  experiment: one(experiments, {
    fields: [experimentResults.experimentId],
    references: [experiments.id],
  }),
}));

// Type exports
export type Experiment = typeof experiments.$inferSelect;
export type NewExperiment = typeof experiments.$inferInsert;
export type ExperimentVariant = typeof experimentVariants.$inferSelect;
export type NewExperimentVariant = typeof experimentVariants.$inferInsert;
export type VariantAssignment = typeof variantAssignments.$inferSelect;
export type NewVariantAssignment = typeof variantAssignments.$inferInsert;
export type ExperimentResult = typeof experimentResults.$inferSelect;
export type NewExperimentResult = typeof experimentResults.$inferInsert;
