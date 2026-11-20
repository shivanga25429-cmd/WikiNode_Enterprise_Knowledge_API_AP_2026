import pg from 'pg';

const { Pool } = pg;

// This is the application's only database connection layer. No ORM is used.
export function createPool(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must point to the WikiNode PostgreSQL database');
  }

  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
}
