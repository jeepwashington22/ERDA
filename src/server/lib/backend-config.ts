type BackendConfig = {
  redisUrl: string;
  redisKeyPrefix: string;
  redisDefaultTtlSeconds: number;
  redisStaleWhileRevalidateSeconds: number;
  redisLockTtlMs: number;
  redisBreakerFailureThreshold: number;
  redisBreakerCooldownMs: number;
  supabasePoolUrl: string;
  supabasePrimaryUrl: string;
  supabasePrimaryServiceRoleKey: string;
  supabaseBackupUrl: string;
  supabaseBackupServiceRoleKey: string;
};

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const backendConfig: BackendConfig = {
  redisUrl: process.env.REDIS_URL ?? "",
  redisKeyPrefix: process.env.REDIS_KEY_PREFIX ?? "erda-scholar",
  redisDefaultTtlSeconds: parseNumber(process.env.REDIS_DEFAULT_TTL_SECONDS, 300),
  redisStaleWhileRevalidateSeconds: parseNumber(process.env.REDIS_STALE_WHILE_REVALIDATE_SECONDS, 900),
  redisLockTtlMs: parseNumber(process.env.REDIS_LOCK_TTL_MS, 10000),
  redisBreakerFailureThreshold: parseNumber(process.env.REDIS_BREAKER_FAILURE_THRESHOLD, 5),
  redisBreakerCooldownMs: parseNumber(process.env.REDIS_BREAKER_COOLDOWN_MS, 30000),
  supabasePoolUrl: process.env.SUPABASE_POOL_URL ?? "",
  supabasePrimaryUrl: process.env.SUPABASE_URL ?? "",
  supabasePrimaryServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseBackupUrl: process.env.SUPABASE_BACKUP_URL ?? "",
  supabaseBackupServiceRoleKey: process.env.SUPABASE_BACKUP_SERVICE_ROLE_KEY ?? "",
};

export function getConfiguredBackendChannels() {
  return {
    redis: Boolean(backendConfig.redisUrl),
    pooledDatabase: Boolean(backendConfig.supabasePoolUrl),
    primaryDatabase: Boolean(backendConfig.supabasePrimaryUrl && backendConfig.supabasePrimaryServiceRoleKey),
    backupDatabase: Boolean(backendConfig.supabaseBackupUrl && backendConfig.supabaseBackupServiceRoleKey),
  };
}

export function getMissingBackendSecrets() {
  const missing: string[] = [];

  if (!backendConfig.redisUrl) {
    missing.push("REDIS_URL");
  }

  if (!backendConfig.supabasePoolUrl) {
    missing.push("SUPABASE_POOL_URL");
  }

  if (!backendConfig.supabasePrimaryUrl) {
    missing.push("SUPABASE_URL");
  }

  if (!backendConfig.supabasePrimaryServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  return missing;
}