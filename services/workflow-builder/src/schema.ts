import { pgTable, uuid, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";

/**
 * WORKFLOW BUILDER SCHEMA
 * =======================
 * 
 * Visual workflow automation engine:
 * - Drag-drop workflow designer
 * - Multi-step processes with conditional logic
 * - Integration triggers (webhooks, API calls, database events)
 * - Real-time execution monitoring
 */

// Workflows - Main workflow definitions
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // Workflow Definition (JSON representation of visual editor)
  definition: jsonb("definition").$type<{
    nodes: Array<{
      id: string;
      type: 'trigger' | 'action' | 'condition' | 'loop' | 'delay' | 'webhook' | 'api-call' | 'database' | 'notification';
      position: { x: number; y: number };
      data: {
        label: string;
        config: Record<string, any>;
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
      condition?: string; // For conditional branches
    }>;
  }>().notNull(),
  
  // Trigger Configuration
  trigger: jsonb("trigger").$type<{
    type: 'qr-scan' | 'webhook' | 'schedule' | 'manual' | 'database-event';
    config: Record<string, any>;
  }>().notNull(),
  
  // Status
  status: text("status").notNull().default('draft'), // draft | active | paused | archived
  version: integer("version").default(1),
  
  // Execution stats
  totalExecutions: integer("total_executions").default(0),
  successfulExecutions: integer("successful_executions").default(0),
  failedExecutions: integer("failed_executions").default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  
  // Settings
  isTemplate: boolean("is_template").default(false),
  category: text("category"), // 'asset-management', 'marketing', 'compliance', 'operations'
  tags: jsonb("tags").$type<string[]>(),
  
  // Metadata
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
});

// Workflow Executions - Runtime instances
export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id).notNull(),
  
  // Execution context
  triggerData: jsonb("trigger_data").$type<Record<string, any>>(), // Data that triggered the workflow
  
  // Current state
  status: text("status").notNull().default('running'), // running | completed | failed | cancelled
  currentNodeId: text("current_node_id"), // Which node is currently executing
  
  // Execution trace (for debugging and visualization)
  executionTrace: jsonb("execution_trace").$type<Array<{
    nodeId: string;
    nodeName: string;
    startedAt: string;
    completedAt?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    input?: Record<string, any>;
    output?: Record<string, any>;
    error?: string;
  }>>().default([]),
  
  // Variables context (data passed between nodes)
  variables: jsonb("variables").$type<Record<string, any>>().default({}),
  
  // Error handling
  error: text("error"),
  errorNodeId: text("error_node_id"),
  
  // Timing
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // milliseconds
});

// Workflow Templates - Pre-built workflows
export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  
  // Same definition structure as workflows
  definition: jsonb("definition").notNull(),
  trigger: jsonb("trigger").notNull(),
  
  // Preview & documentation
  thumbnailUrl: text("thumbnail_url"),
  documentation: text("documentation"),
  useCase: text("use_case"), // Detailed use case explanation
  
  // Usage stats
  usageCount: integer("usage_count").default(0),
  rating: integer("rating").default(5),
  
  // Tags for filtering
  tags: jsonb("tags").$type<string[]>(),
  industryTags: jsonb("industry_tags").$type<string[]>(), // 'healthcare', 'manufacturing', 'logistics'
  
  isPremium: boolean("is_premium").default(false),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook Endpoints - For external integrations
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // Webhook URL (unique per endpoint)
  webhookUrl: text("webhook_url").notNull().unique(),
  webhookSecret: text("webhook_secret"), // For HMAC verification
  
  // Configuration
  method: text("method").notNull().default('POST'), // GET | POST | PUT | DELETE
  headers: jsonb("headers").$type<Record<string, string>>(),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Stats
  totalCalls: integer("total_calls").default(0),
  lastCalledAt: timestamp("last_called_at"),
  
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Integration Connections - Saved API credentials
export const integrationConnections = pgTable("integration_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(),
  
  name: text("name").notNull(),
  type: text("type").notNull(), // 'salesforce', 'servicenow', 'slack', 'teams', 'http-api'
  
  // Credentials (encrypted in production)
  credentials: jsonb("credentials").$type<{
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    baseUrl?: string;
    [key: string]: any;
  }>().notNull(),
  
  // OAuth tokens
  oauthAccessToken: text("oauth_access_token"),
  oauthRefreshToken: text("oauth_refresh_token"),
  oauthExpiresAt: timestamp("oauth_expires_at"),
  
  // Status
  isActive: boolean("is_active").default(true),
  lastTestedAt: timestamp("last_tested_at"),
  lastTestStatus: text("last_test_status"), // 'success' | 'failed'
  
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scheduled Jobs - For cron-based workflow triggers
export const scheduledJobs = pgTable("scheduled_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id).notNull(),
  
  name: text("name").notNull(),
  cronExpression: text("cron_expression").notNull(), // '0 9 * * 1' = Every Monday at 9am
  timezone: text("timezone").default('UTC'),
  
  // Execution tracking
  nextRunAt: timestamp("next_run_at"),
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: text("last_run_status"), // 'success' | 'failed'
  
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
