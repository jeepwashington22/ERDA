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
      // Fail fast enough to retry rather than hanging a server render.
      connectionTimeoutMillis: 15000,
      // Recycle pooled connections so long-lived idle sockets (which Supabase's
      // pooler drops server-side) are never handed to a new query.
      idleTimeoutMillis: 30000,
      maxUses: 7500,
      keepAlive: true,
      statement_timeout: 60000,
    });
  }

  return globalThis.__erdaScholarPostgresPool;
}

/**
 * Transient network errors (stale pooler sockets, momentary connectivity loss)
 * are retried once with a fresh connection before surfacing to the caller.
 */
const TRANSIENT_CODES = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EPIPE", "57P01"]);

export async function queryPostgres<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const pool = getPostgresPool();
  try {
    const result = await pool.query<T>(text, params);
    return result.rows;
  } catch (err) {
    const code =
      (err as { code?: string; errno?: string })?.code ??
      (err as { errno?: string })?.errno ??
      ((err instanceof Error && /connect ETIMEDOUT|ECONNRESET/i.test(err.message) ? "ETIMEDOUT" : undefined));
    if (code && TRANSIENT_CODES.has(code)) {
      // Give the pooler a moment, then retry once on a new connection.
      await new Promise((resolve) => setTimeout(resolve, 500));
      const result = await pool.query<T>(text, params);
      return result.rows;
    }
    throw err;
  }
}