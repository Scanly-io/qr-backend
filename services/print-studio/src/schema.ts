import { pgTable, uuid, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";

/**
 * PRINT STUDIO SCHEMA
 * ===================
 * 
 * Print templates, batch jobs, and generated PDFs
 */

// Print Templates - User-defined label layouts
export const printTemplates = pgTable("print_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // Template Type
  labelFormat: text("label_format").notNull(), // 'avery-5160', 'avery-5163', 'dymo-30252', 'custom'
  
  // Dimensions (in mm)
  pageWidth: integer("page_width").notNull(), // 215.9 (8.5")
  pageHeight: integer("page_height").notNull(), // 279.4 (11")
  labelWidth: integer("label_width").notNull(), // 66.675 (2.625")
  labelHeight: integer("label_height").notNull(), // 25.4 (1")
  columns: integer("columns").default(3),
  rows: integer("rows").default(10),
  marginTop: integer("margin_top").default(0),
  marginLeft: integer("margin_left").default(0),
  gapX: integer("gap_x").default(0), // Horizontal gap between labels
  gapY: integer("gap_y").default(0), // Vertical gap between labels
  
  // Template Design (WYSIWYG editor output)
  design: jsonb("design").$type<{
    elements: Array<{
      type: 'qr' | 'text' | 'image' | 'barcode';
      x: number;
      y: number;
      width: number;
      height: number;
      content?: string;
      fontSize?: number;
      fontFamily?: string;
      align?: 'left' | 'center' | 'right';
      bold?: boolean;
      dataField?: string; // For dynamic content like {asset_name}, {serial_number}
    }>;
    qrSize?: number;
    qrMargin?: number;
  }>(),
  
  // Preview thumbnail
  previewUrl: text("preview_url"),
  
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Batch Print Jobs
export const printJobs = pgTable("print_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(),
  
  name: text("name").notNull(),
  templateId: uuid("template_id").references(() => printTemplates.id),
  
  // Job Configuration
  qrCodes: jsonb("qr_codes").$type<Array<{
    id: string;
    url: string;
    data?: Record<string, any>; // Custom data for template fields
  }>>().notNull(),
  
  totalQRs: integer("total_qrs").notNull(),
  
  // Output
  status: text("status").notNull().default('pending'), // pending | processing | completed | failed
  pdfUrl: text("pdf_url"), // S3/R2 URL of generated PDF
  pdfSize: integer("pdf_size"), // File size in bytes
  pageCount: integer("page_count"),
  
  // Error handling
  error: text("error"),
  
  // Processing metadata
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Template Library - Pre-built templates
export const templateLibrary = pgTable("template_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // 'asset-labels', 'product-labels', 'shipping', 'inventory'
  labelFormat: text("label_format").notNull(),
  
  // Same design schema as printTemplates
  design: jsonb("design"),
  
  // Preview
  previewUrl: text("preview_url"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Usage stats
  usageCount: integer("usage_count").default(0),
  rating: integer("rating").default(5),
  
  isPremium: boolean("is_premium").default(false),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});
