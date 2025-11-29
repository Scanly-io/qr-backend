import 'dotenv/config';
import { Pool } from 'pg';

// Minimal manual DDL creator for microsite-service when drizzle push is unavailable.
// Idempotent: uses IF NOT EXISTS and checks columns where practical.

const ddl = `
CREATE TABLE IF NOT EXISTS microsites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  theme jsonb,
  links jsonb,
  layout jsonb,
  published_html text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  published_at timestamp,
  created_by text
);

CREATE TABLE IF NOT EXISTS microsite_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  microsite_id uuid NOT NULL REFERENCES microsites(id) ON DELETE CASCADE,
  user_id text,
  timestamp timestamp DEFAULT now() NOT NULL,
  raw_payload jsonb
);
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const pool = new Pool({ connectionString: url });
  try {
    console.log('Applying microsite DDL...');
    await pool.query(ddl);
    console.log('DDL applied.');
    const { rows } = await pool.query('SELECT qr_id FROM microsites LIMIT 5');
    console.log('Sample microsites rows:', rows);
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
