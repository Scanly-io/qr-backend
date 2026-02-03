/**
 * Test Database Helpers
 * 
 * Provides utilities for database testing:
 * - In-memory database for fast tests
 * - Test data factories
 * - Database cleanup utilities
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const { Pool } = pg;

/**
 * Create a test database connection
 * Uses DATABASE_URL_TEST or falls back to in-memory sqlite
 */
export async function createTestDb() {
  const connectionString = process.env.DATABASE_URL_TEST || 
    'postgresql://postgres:postgres@localhost:5432/qr_test';
  
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  
  return { db, pool };
}

/**
 * Clean all tables in the test database
 */
export async function cleanDatabase(db: any) {
  // Truncate all tables (adjust based on your schema)
  await db.execute(`
    TRUNCATE TABLE users, qrs, microsites, events, leads 
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Close database connection
 */
export async function closeDatabase(pool: any) {
  await pool.end();
}

/**
 * Test data factories
 */
export const factories = {
  user: (overrides = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: '$2b$10$testhashedpassword',
    createdAt: new Date(),
    ...overrides,
  }),
  
  qr: (overrides = {}) => ({
    qrId: `test-qr-${Date.now()}`,
    targetUrl: 'https://example.com',
    createdAt: new Date(),
    ...overrides,
  }),
  
  microsite: (overrides = {}) => ({
    title: 'Test Microsite',
    description: 'Test description',
    theme: { primaryColor: '#000000' },
    links: [],
    layout: null,
    createdAt: new Date(),
    ...overrides,
  }),
  
  lead: (overrides = {}) => ({
    qrId: `test-qr-${Date.now()}`,
    name: 'Test User',
    email: `lead-${Date.now()}@example.com`,
    message: 'Test message',
    source: 'form',
    consentGiven: true,
    consentTimestamp: new Date(),
    ...overrides,
  }),
};
