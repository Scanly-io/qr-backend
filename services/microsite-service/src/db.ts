import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import "dotenv/config";
import * as schema from "./schema.js";
import { logger } from "@qr/common";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle client");
  process.exit(-1);
});