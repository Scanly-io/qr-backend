import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const connectionString = `postgresql://${process.env.AUTH_DB_USER}:${process.env.AUTH_DB_PASSWORD}@${process.env.AUTH_DB_HOST}:${process.env.AUTH_DB_PORT}/${process.env.AUTH_DB_NAME}`;

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
