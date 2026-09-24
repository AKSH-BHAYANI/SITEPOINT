import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function isLikelyPostgresUrl(str?: string): boolean {
  if (!str) return false;
  const s = str.trim();
  return (
    s.startsWith('postgresql://') ||
    s.startsWith('postgres://') ||
    (s.includes('=') && (s.includes('host=') || s.includes('dbname=')))
  );
}

const rawDbUrl = process.env.DATABASE_URL?.trim();
const hasDatabaseUrl = isLikelyPostgresUrl(rawDbUrl);

let dbCredentials:
  | { url: string }
  | {
      host: string;
      user: string;
      password?: string;
      database: string;
      port?: number;
      ssl?: boolean;
    };

if (hasDatabaseUrl && rawDbUrl) {
  // Support Render and standard PostgreSQL DATABASE_URL
  dbCredentials = {
    url: rawDbUrl,
  };
} else {
  // Fall back to discrete SQL_* environment variables
  const sqlHost = process.env.SQL_HOST;
  const sqlDbName = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;
  const port = process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432;

  if (!sqlHost || !sqlDbName || !user || !password) {
    throw new Error(
      'Database configuration missing: Provide either DATABASE_URL or SQL_HOST, SQL_DB_NAME, SQL_ADMIN_USER/SQL_USER, and SQL_ADMIN_PASSWORD/SQL_PASSWORD.'
    );
  }

  dbCredentials = {
    host: sqlHost,
    user,
    password,
    database: sqlDbName,
    ...(port && !sqlHost.startsWith('/') ? { port } : {}),
    ssl: false,
  };
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials,
  verbose: true,
});
