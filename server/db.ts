import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL not set — scores API will be unavailable. " +
    "Add your Supabase connection string to .env to enable it."
  );
}

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;
