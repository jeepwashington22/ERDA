import { backendConfig, getConfiguredBackendChannels, getMissingBackendSecrets } from "../lib/backend-config";

export function getBackendArchitectureSummary() {
  return {
    configured: getConfiguredBackendChannels(),
    missingSecrets: getMissingBackendSecrets(),
    cachePolicy: {
      defaultTtlSeconds: backendConfig.redisDefaultTtlSeconds,
      staleWhileRevalidateSeconds: backendConfig.redisStaleWhileRevalidateSeconds,
      lockTtlMs: backendConfig.redisLockTtlMs,
      breakerFailureThreshold: backendConfig.redisBreakerFailureThreshold,
      breakerCooldownMs: backendConfig.redisBreakerCooldownMs,
    },
    recommendedRedisEvictionPolicy: "allkeys-lru",
  };
}
