import { Pool, PoolClient, types } from 'pg';
import { config } from '../config';

// DATE columns are kept as plain YYYY-MM-DD strings, independent of the process time zone.
types.setTypeParser(types.builtins.DATE, (value: string) => value);

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl, max: 20 });
    pool.on('error', (err) => {
      console.error('Erro inesperado na conexão com o banco:', err.message);
    });
  }
  return pool;
}

export type Db = Pick<PoolClient, 'query'>;

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
