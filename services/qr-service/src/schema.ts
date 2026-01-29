import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const qrs = pgTable("qrs", {
  id: serial("id").primaryKey(),
  qrId: text("qr_id").notNull().unique(),
  targetUrl: text("target_url").notNull(),
  createdBy: text("created_by"),
  style: jsonb("style"), // Store QR styling options
  createdAt: timestamp("created_at").defaultNow(),
});
