import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { qrs } from "./schema.js";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});