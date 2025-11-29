import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const microsites = pgTable("microsites", {
  id: uuid("id").defaultRandom().primaryKey(),

  qrId: text("qr_id").notNull().unique(),

  // Editable fields
  title: text("title").notNull(),
  description: text("description"),
  theme: jsonb("theme"),
  links: jsonb("links"),

  // 🆕 Raw drag-and-drop structure
  layout: jsonb("layout"),

  // 🆕 Final published HTML
  publishedHtml: text("published_html"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
  createdBy:text("created_by"),
});

export const micrositeVisits = pgTable("microsite_visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  micrositeId: uuid("microsite_id")
    .notNull()
    .references(() => microsites.id),
  userId: text("user_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  rawPayload: jsonb("raw_payload"),
});         