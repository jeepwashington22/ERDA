import { Pool } from "pg";
import type { QueryResultRow } from "pg";

import { backendConfig } from "./backend-config";

declare global {
  // eslint-disable-next-line no-var
  var __erdaScholarPostgresPool: Pool | undefined;
}

function getPostgresPool(): Pool {
  if (!backendConfig.supabasePoolUrl) {
    throw new Error("SUPABASE_POOL_URL is not configured.");
  }

  if (!globalThis.__erdaScholarPostgresPool) {
    globalThis.__erdaScholarPostgresPool = new Pool({
      connectionString: backendConfig.supabasePoolUrl,
      max: 10,
      connectionTimeoutMillis: 60000, // 60 seconds
    });
  }

  return globalThis.__erdaScholarPostgresPool;
}

export async function queryPostgres<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const pool = getPostgresPool();
  const result = await pool.query<T>(text, params);

  return result.rows;
}