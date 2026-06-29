import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Lazy Postgres client (Neon serverless). Only connects at request time, so the
// app still builds/runs before DATABASE_URL is set. Set it from your Neon project.
let _sql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

export function dbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
