import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  qrId: text("qr_id").notNull(),
  userId: text("user_id"),
  eventType: text("event_type").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  rawPayload: jsonb("raw_payload"),
});

