import { randomUUID } from "crypto";
import Redis from "ioredis";

import { backendConfig } from "./backend-config";
import { CircuitBreaker } from "./circuit-breaker";

type CacheEnvelope<T> = {
  value: T;
  cachedAt: number;
  staleAt: number;
};

type RedisCacheOptions = {
  keyPrefix?: string;
  defaultTtlSeconds?: number;
  staleWhileRevalidateSeconds?: number;
  breaker?: CircuitBreaker;
};

const releaseLockScript = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  end
  return 0
`;

export function createRedisClient() {
  if (!backendConfig.redisUrl) {
    return null;
  }

  return new Redis(backendConfig.redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    retryStrategy(attempt) {
      return Math.min(attempt * 100, 2000);
    },
  });
}

export class RedisCacheService {
  private readonly client: Redis | null;

  private readonly breaker: CircuitBreaker;

  private readonly keyPrefix: string;

  private readonly defaultTtlSeconds: number;

  private readonly staleWhileRevalidateSeconds: number;

  constructor(client: Redis | null, options: RedisCacheOptions = {}) {
    this.client = client;
    this.breaker = options.breaker ?? new CircuitBreaker({
      failureThreshold: backendConfig.redisBreakerFailureThreshold,
      cooldownMs: backendConfig.redisBreakerCooldownMs,
    });
    this.keyPrefix = options.keyPrefix ?? backendConfig.redisKeyPrefix;
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? backendConfig.redisDefaultTtlSeconds;
    this.staleWhileRevalidateSeconds = options.staleWhileRevalidateSeconds ?? backendConfig.redisStaleWhileRevalidateSeconds;
  }

  get state() {
    return this.breaker.snapshot();
  }

  isAvailable(): boolean {
    return this.client !== null && this.breaker.canAttempt();
  }

  private makeKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  private async run<T>(operation: () => Promise<T>): Promise<T | null> {
    if (!this.client || !this.breaker.canAttempt()) {
      return null;
    }

    try {
      const result = await operation();
      this.breaker.recordSuccess();
      return result;
    } catch {
      this.breaker.recordFailure();
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.run(async () => {
      const raw = await this.client!.get(this.makeKey(key));

      if (!raw) {
        return null;
      }

      const envelope = JSON.parse(raw) as CacheEnvelope<T>;

      if (envelope.staleAt < Date.now()) {
        return envelope.value;
      }

      return envelope.value;
    });

    return value;
  }

  async set<T>(key: string, value: T, ttlSeconds = this.defaultTtlSeconds): Promise<boolean> {
    const result = await this.run(async () => {
      const envelope: CacheEnvelope<T> = {
        value,
        cachedAt: Date.now(),
        staleAt: Date.now() + this.staleWhileRevalidateSeconds * 1000,
      };

      await this.client!.set(this.makeKey(key), JSON.stringify(envelope), "EX", ttlSeconds);
      return true;
    });

    return Boolean(result);
  }

  async del(key: string): Promise<boolean> {
    const result = await this.run(async () => {
      await this.client!.del(this.makeKey(key));
      return true;
    });

    return Boolean(result);
  }

  async acquireLock(key: string, ttlMs = backendConfig.redisLockTtlMs): Promise<string | null> {
    const token = randomUUID();

    const result = await this.run(async () => this.client!.set(this.makeKey(`lock:${key}`), token, "PX", ttlMs, "NX"));

    return result === "OK" ? token : null;
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const result = await this.run(async () => this.client!.eval(releaseLockScript, 1, this.makeKey(`lock:${key}`), token));

    return Boolean(result);
  }

  async getOrLoad<T>(key: string, loader: () => Promise<T>, ttlSeconds = this.defaultTtlSeconds): Promise<T> {
    const cachedValue = await this.get<T>(key);

    if (cachedValue !== null) {
      return cachedValue;
    }

    const lockToken = await this.acquireLock(key);

    if (lockToken) {
      try {
        const secondLookup = await this.get<T>(key);

        if (secondLookup !== null) {
          return secondLookup;
        }

        const loadedValue = await loader();
        await this.set(key, loadedValue, ttlSeconds);
        return loadedValue;
      } finally {
        await this.releaseLock(key, lockToken);
      }
    }

    const loadedValue = await loader();
    return loadedValue;
  }
}
