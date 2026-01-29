/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DATABASE CONNECTION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🗄️ PURPOSE:
 * Connects to PostgreSQL database where all experiment data is stored.
 * 
 * 📊 DATABASE: experiments_db
 * 
 * 📋 TABLES (4):
 * 1. experiments - Main experiment configurations (test settings)
 * 2. experiment_variants - Different versions being tested
 * 3. variant_assignments - Tracks which user got which variant
 * 4. experiment_results - Aggregated statistics and winner info
 * 
 * 🔧 TOOLS:
 * - Drizzle ORM: Type-safe database queries (like TypeScript for databases)
 * - Postgres.js: Fast PostgreSQL driver
 * 
 * 💡 WHY SEPARATE DATABASE?
 * Each microservice has its own database (experiments_db, qr_service_db, etc.)
 * This follows "Database per Service" pattern - prevents services from
 * interfering with each other's data.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database connection string from environment variables
const connectionString = process.env.DATABASE_URL || 'postgresql://qr_user:qr_password@localhost:5432/experiments_db';

// Create PostgreSQL client
export const client = postgres(connectionString);

// Create Drizzle ORM instance (provides type-safe database queries)
export const db = drizzle(client, { schema });
