import {pgTable, uuid, text, timestamp, boolean, varchar, jsonb, integer, decimal, index} from "drizzle-orm/pg-core";      

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name"),
    passwordHash: text("password_hash").notNull(),
    
    // Agency/Organization affiliation
    organizationId: uuid("organization_id"), // null = individual user
    role: varchar("role", { length: 50 }).default("user"), // 'user', 'agency_admin', 'agency_member', 'reseller'
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    orgIdx: index("users_organization_idx").on(table.organizationId),
}));

// 🆕 PIVOT 1: White-Label Agency Platform
export const agencies = pgTable("agencies", {
    id: uuid("id").primaryKey().defaultRandom(),
    
    // Agency identity
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(), // agency-branded subdomain
    website: text("website"),
    
    // White-label branding
    whiteLabel: jsonb("white_label").$type<{
        logo: string;
        favicon: string;
        primaryColor: string;
        secondaryColor: string;
        customDomain?: string; // e.g., builder.agency.com
        emailFromName?: string;
        emailFromAddress?: string;
        supportEmail?: string;
        customCss?: string;
        hidePoweredBy: boolean;
    }>(),
    
    // Subscription & billing
    plan: varchar("plan", { length: 50 }).notNull().default("starter"), // 'starter', 'professional', 'enterprise'
    seats: integer("seats").notNull().default(5), // number of agency members
    seatsUsed: integer("seats_used").notNull().default(0),
    mrr: decimal("mrr", { precision: 10, scale: 2 }), // Monthly recurring revenue
    
    // Limits per plan
    limits: jsonb("limits").$type<{
        maxMicrosites: number;
        maxSeats: number;
        maxDigitalSalesRooms: number;
        customDomain: boolean;
        whiteLabel: boolean;
        apiAccess: boolean;
        dedicatedSupport: boolean;
    }>(),
    
    // Status
    status: varchar("status", { length: 20 }).notNull().default("active"), // 'active', 'suspended', 'cancelled'
    trialEndsAt: timestamp("trial_ends_at"),
    
    // Owner
    ownerId: uuid("owner_id").notNull(),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    slugIdx: index("agencies_slug_idx").on(table.slug),
    ownerIdx: index("agencies_owner_idx").on(table.ownerId),
}));

// Agency team members
export const agencyMembers = pgTable("agency_members", {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id").notNull().references(() => agencies.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    
    role: varchar("role", { length: 50 }).notNull().default("member"), // 'owner', 'admin', 'member', 'viewer'
    permissions: jsonb("permissions").$type<{
        createMicrosites: boolean;
        editMicrosites: boolean;
        deleteMicrosites: boolean;
        manageBilling: boolean;
        manageTeam: boolean;
        viewAnalytics: boolean;
    }>(),
    
    invitedAt: timestamp("invited_at").defaultNow(),
    joinedAt: timestamp("joined_at"),
    status: varchar("status", { length: 20 }).notNull().default("active"), // 'invited', 'active', 'suspended'
}, (table) => ({
    agencyUserIdx: index("agency_members_agency_user_idx").on(table.agencyId, table.userId),
})); 
