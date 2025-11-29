import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { scans } from './schema';
import { logger } from '@qr/common';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle client');
  process.exit(-1);
});
