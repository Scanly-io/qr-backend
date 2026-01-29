/**
 * Database Connection for Integrations Service
 * 
 * Database: integrations_db
 * 
 * Tables:
 * 1. integrations - Connected apps/services
 * 2. webhooks - Webhook configurations
 * 3. webhook_logs - Delivery history & retries
 * 4. oauth_tokens - OAuth 2.0 credentials
 * 5. integration_mappings - Field mapping configs
 * 
 * Uses Drizzle ORM for type-safe database queries
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/integrations_db';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
