import { drizzle } from "drizzle-orm/node-postgres";
import { users, agencies, agencyMembers } from "./schema.js";
import "dotenv/config";
import { Pool } from "pg";
import { logger } from "@qr/common";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema: { users, agencies, agencyMembers } });
export { users, agencies, agencyMembers };

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle client");
  process.exit(-1);
}); 
