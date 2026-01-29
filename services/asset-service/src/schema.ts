import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, decimal, index } from "drizzle-orm/pg-core";

/**
 * ASSET MANAGEMENT SCHEMA
 * ======================
 * 
 * Complete asset tracking system matching OpenScreen Track capabilities:
 * - Asset inventory and categorization
 * - QR code assignment to physical assets
 * - Maintenance schedules and history
 * - Compliance tracking and inspections
 * - Service requests and work orders
 * - Lifecycle management (procurement → retirement)
 */

// Asset Types/Categories
export const assetTypes = pgTable("asset_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(), // Multi-tenancy
  
  name: text("name").notNull(), // "Network Equipment", "Medical Devices", "Facilities"
  slug: text("slug").notNull(), // "network-equipment"
  description: text("description"),
  icon: text("icon"), // Icon identifier
  color: text("color"), // Brand color for UI
  
  // Custom fields configuration for this asset type
  customFields: jsonb("custom_fields").$type<{
    fieldName: string;
    fieldType: 'text' | 'number' | 'date' | 'select' | 'boolean';
    required: boolean;
    options?: string[]; // For select fields
  }[]>(),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("asset_types_org_idx").on(table.organizationId),
  slugIdx: index("asset_types_slug_idx").on(table.slug),
}));

// Assets (Physical resources being tracked)
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(),
  assetTypeId: uuid("asset_type_id").references(() => assetTypes.id),
  
  // Basic Info
  assetTag: text("asset_tag").notNull().unique(), // Unique identifier (like serial number)
  name: text("name").notNull(), // "Server Rack A1", "MRI Machine Room 203"
  description: text("description"),
  
  // QR Code Assignment
  qrCodeId: text("qr_code_id").unique(), // Link to QR service
  qrCodeUrl: text("qr_code_url"), // Scan URL for this asset
  
  // Location
  locationId: uuid("location_id"), // References locations table
  locationName: text("location_name"), // "Building A, Floor 3, Room 301"
  gpsLatitude: decimal("gps_latitude", { precision: 10, scale: 7 }),
  gpsLongitude: decimal("gps_longitude", { precision: 10, scale: 7 }),
  
  // Asset Details
  manufacturer: text("manufacturer"), // "Dell", "GE Healthcare", "Cisco"
  model: text("model"), // "PowerEdge R740", "Signa Explorer"
  serialNumber: text("serial_number"),
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 2 }),
  warrantyExpires: timestamp("warranty_expires"),
  
  // Lifecycle Status
  status: text("status").notNull().default('active'), 
  // active | in_service | maintenance | out_of_service | retired | disposed
  
  assignedTo: text("assigned_to"), // User ID or department
  responsiblePerson: text("responsible_person"), // Name/email
  
  // Criticality
  criticality: text("criticality").default('medium'), // low | medium | high | critical
  
  // Maintenance
  maintenanceSchedule: text("maintenance_schedule"), // "monthly" | "quarterly" | "annually"
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  
  // Custom Fields (asset-type specific data)
  customData: jsonb("custom_data"),
  
  // Images and Documents
  images: jsonb("images").$type<string[]>(), // Array of image URLs
  documents: jsonb("documents").$type<{
    name: string;
    url: string;
    type: string;
    uploadedAt: string;
  }[]>(),
  
  // Metadata
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>(), // ["network", "critical", "datacenter"]
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by"),
}, (table) => ({
  orgIdx: index("assets_org_idx").on(table.organizationId),
  assetTagIdx: index("assets_asset_tag_idx").on(table.assetTag),
  qrCodeIdx: index("assets_qr_code_idx").on(table.qrCodeId),
  statusIdx: index("assets_status_idx").on(table.status),
  typeIdx: index("assets_type_idx").on(table.assetTypeId),
  locationIdx: index("assets_location_idx").on(table.locationId),
}));

// Locations (Where assets are physically located)
export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(),
  
  name: text("name").notNull(), // "Building A"
  fullPath: text("full_path"), // "Campus > Building A > Floor 3 > Room 301"
  parentId: uuid("parent_id"), // For hierarchical locations
  
  type: text("type"), // "building" | "floor" | "room" | "zone"
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  
  gpsLatitude: decimal("gps_latitude", { precision: 10, scale: 7 }),
  gpsLongitude: decimal("gps_longitude", { precision: 10, scale: 7 }),
  
  contactPerson: text("contact_person"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("locations_org_idx").on(table.organizationId),
  parentIdx: index("locations_parent_idx").on(table.parentId),
}));

// Maintenance Records
export const maintenanceRecords = pgTable("maintenance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  organizationId: text("organization_id").notNull(),
  
  type: text("type").notNull(), // "preventive" | "corrective" | "inspection" | "calibration"
  title: text("title").notNull(),
  description: text("description"),
  
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  status: text("status").default('scheduled'), // scheduled | in_progress | completed | cancelled
  
  performedBy: text("performed_by"), // Technician name/ID
  vendor: text("vendor"), // External service provider
  
  hoursSpent: decimal("hours_spent", { precision: 5, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  
  notes: text("notes"),
  findings: text("findings"),
  recommendations: text("recommendations"),
  
  // Parts used
  partsReplaced: jsonb("parts_replaced").$type<{
    partName: string;
    partNumber: string;
    quantity: number;
    cost: number;
  }[]>(),
  
  // Attachments (photos, reports)
  attachments: jsonb("attachments").$type<{
    name: string;
    url: string;
    type: string;
  }[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  assetIdx: index("maintenance_asset_idx").on(table.assetId),
  orgIdx: index("maintenance_org_idx").on(table.organizationId),
  statusIdx: index("maintenance_status_idx").on(table.status),
  scheduledIdx: index("maintenance_scheduled_idx").on(table.scheduledDate),
}));

// Service Requests (User-initiated support tickets)
export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").references(() => assets.id),
  organizationId: text("organization_id").notNull(),
  
  ticketNumber: text("ticket_number").notNull().unique(), // "SR-2026-00001"
  
  // Request Details
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category"), // "repair" | "malfunction" | "question" | "installation"
  priority: text("priority").default('medium'), // low | medium | high | urgent
  
  // Requester Info
  requestedBy: text("requested_by").notNull(), // User ID or name
  requestedByEmail: text("requested_by_email"),
  requestedByPhone: text("requested_by_phone"),
  
  // Assignment
  assignedTo: text("assigned_to"), // Technician/team
  assignedAt: timestamp("assigned_at"),
  
  // Status Tracking
  status: text("status").default('open'), 
  // open | assigned | in_progress | on_hold | resolved | closed | cancelled
  
  // Resolution
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  
  // SLA tracking
  dueDate: timestamp("due_date"),
  isOverdue: boolean("is_overdue").default(false),
  
  // Photos/attachments from requester
  attachments: jsonb("attachments").$type<{
    name: string;
    url: string;
    uploadedBy: string;
    uploadedAt: string;
  }[]>(),
  
  // Activity log
  activityLog: jsonb("activity_log").$type<{
    timestamp: string;
    action: string;
    user: string;
    notes?: string;
  }[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  closedAt: timestamp("closed_at"),
}, (table) => ({
  assetIdx: index("service_requests_asset_idx").on(table.assetId),
  orgIdx: index("service_requests_org_idx").on(table.organizationId),
  statusIdx: index("service_requests_status_idx").on(table.status),
  ticketIdx: index("service_requests_ticket_idx").on(table.ticketNumber),
  priorityIdx: index("service_requests_priority_idx").on(table.priority),
}));

// Compliance & Inspections
export const inspections = pgTable("inspections", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  organizationId: text("organization_id").notNull(),
  
  inspectionType: text("inspection_type").notNull(), // "safety" | "regulatory" | "quality" | "environmental"
  title: text("title").notNull(),
  description: text("description"),
  
  // Scheduling
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  dueDate: timestamp("due_date"),
  
  // Status
  status: text("status").default('pending'), // pending | in_progress | completed | failed | overdue
  result: text("result"), // "pass" | "fail" | "conditional_pass"
  
  // Inspector
  inspectedBy: text("inspected_by"),
  inspectorName: text("inspector_name"),
  inspectorCredentials: text("inspector_credentials"),
  
  // Checklist items
  checklistItems: jsonb("checklist_items").$type<{
    item: string;
    checked: boolean;
    status: 'pass' | 'fail' | 'na';
    notes?: string;
  }[]>(),
  
  // Findings
  findings: text("findings"),
  correctiveActions: text("corrective_actions"),
  
  // Certification
  certificateNumber: text("certificate_number"),
  certificateExpires: timestamp("certificate_expires"),
  
  // Documentation
  attachments: jsonb("attachments").$type<{
    name: string;
    url: string;
    type: string;
  }[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  assetIdx: index("inspections_asset_idx").on(table.assetId),
  orgIdx: index("inspections_org_idx").on(table.organizationId),
  statusIdx: index("inspections_status_idx").on(table.status),
  scheduledIdx: index("inspections_scheduled_idx").on(table.scheduledDate),
}));

// Asset Audit Trail (All changes to assets)
export const assetAuditLog = pgTable("asset_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  organizationId: text("organization_id").notNull(),
  
  action: text("action").notNull(), // "created" | "updated" | "deleted" | "status_changed" | "assigned" | "transferred"
  field: text("field"), // Field that was changed
  oldValue: text("old_value"),
  newValue: text("new_value"),
  
  performedBy: text("performed_by").notNull(),
  performedByName: text("performed_by_name"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  notes: text("notes"),
  
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  assetIdx: index("audit_asset_idx").on(table.assetId),
  orgIdx: index("audit_org_idx").on(table.organizationId),
  timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
}));
