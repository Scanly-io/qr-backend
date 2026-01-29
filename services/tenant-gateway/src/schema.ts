import { pgTable, uuid, varchar, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

// Mirror of auth-service schema (just the tables we need for tenant lookup)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  organizationId: uuid('organization_id'),
  role: varchar('role', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agencies = pgTable('agencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ownerId: uuid('owner_id').notNull(),
  subscriptionPlan: varchar('subscription_plan', { length: 50 }),
  status: varchar('status', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agencyMembers = pgTable('agency_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  agencyId: uuid('agency_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  permissions: jsonb('permissions').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
