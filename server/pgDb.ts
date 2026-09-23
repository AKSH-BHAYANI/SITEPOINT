import { pool } from '../src/db/index.ts';
import bcrypt from 'bcryptjs';
import { generateSecureCompanyCode } from './companyCode.ts';

/**
 * Converts standard '?' positional placeholders to PostgreSQL '$1, $2, ...' placeholders
 */
export function convertPlaceholders(sql: string): string {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pgSql = convertPlaceholders(sql);
  const result = await pool.query(pgSql, params);
  return result.rows as T[];
}

export async function getOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function execute(sql: string, params: any[] = []): Promise<{ rowCount: number }> {
  const pgSql = convertPlaceholders(sql);
  const result = await pool.query(pgSql, params);
  return { rowCount: result.rowCount || 0 };
}

/**
 * Executes operations in a database transaction with BEGIN ... COMMIT / ROLLBACK
 */
export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
