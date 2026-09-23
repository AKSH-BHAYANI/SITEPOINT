import { drizzle } from 'drizzle-orm/node-postgres';
import pg, { type PoolConfig, type Pool as PgPool } from 'pg';
const { Pool } = pg;
import * as schema from './schema.ts';

declare global {
  var _postgresPool: PgPool | undefined;
}

export function isLikelyPostgresUrl(str?: string): boolean {
  if (!str) return false;
  const s = str.trim();
  return (
    s.startsWith('postgresql://') ||
    s.startsWith('postgres://') ||
    (s.includes('=') && (s.includes('host=') || s.includes('dbname=')))
  );
}

export function getSafeDatabaseDiagnostics() {
  const dbUrl = process.env.DATABASE_URL?.trim();
  const hasValidUrl = isLikelyPostgresUrl(dbUrl);

  if (hasValidUrl && dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      return {
        type: 'DATABASE_URL',
        detected: true,
        host: parsed.hostname || 'database-host',
        port: parsed.port || '5432',
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'default',
      };
    } catch {
      return {
        type: 'DATABASE_URL',
        detected: true,
        host: 'remote-pg-host',
        port: '5432',
        database: 'postgresql',
      };
    }
  }

  const hasSqlConfig = Boolean(process.env.SQL_HOST || process.env.SQL_DB_NAME);
  return {
    type: 'SQL_HOST_ENV',
    detected: hasSqlConfig,
    host: process.env.SQL_HOST
      ? process.env.SQL_HOST.startsWith('/')
        ? 'Cloud SQL Unix Socket'
        : process.env.SQL_HOST
      : 'unconfigured',
    port: process.env.SQL_PORT || '5432',
    database: process.env.SQL_DB_NAME || 'default',
  };
}

export const createPool = () => {
  if (!global._postgresPool) {
    const dbUrl = process.env.DATABASE_URL?.trim();
    const hasValidUrl = isLikelyPostgresUrl(dbUrl);
    const hasSqlConfig = Boolean(process.env.SQL_HOST || process.env.SQL_DB_NAME);

    if (!hasValidUrl && !hasSqlConfig && process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: Database configuration is missing. Provide either DATABASE_URL or SQL_HOST, SQL_USER, SQL_PASSWORD, and SQL_DB_NAME.'
      );
    }

    let config: PoolConfig;

    if (hasValidUrl && dbUrl) {
      config = {
        connectionString: dbUrl,
        max: 10,
        connectionTimeoutMillis: 15000,
      };
    } else {
      config = {
        host: process.env.SQL_HOST,
        port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
      };
    }

    global._postgresPool = new Pool(config);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema });

