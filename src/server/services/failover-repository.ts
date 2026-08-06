import type { SupabaseClient } from "@supabase/supabase-js";

import { CircuitBreaker } from "../lib/circuit-breaker";
import { RedisCacheService } from "../lib/redis";

type RecordShape = {
  id: string;
  [key: string]: unknown;
};

type FailoverRepositoryOptions<TRecord extends RecordShape> = {
  tableName: string;
  cache: RedisCacheService;
  primaryClient: SupabaseClient;
  backupClient: SupabaseClient;
  cacheTtlSeconds?: number;
  cachePrefix?: string;
  primaryBreaker?: CircuitBreaker;
  backupBreaker?: CircuitBreaker;
};

export class FailoverRepository<TRecord extends RecordShape> {
  private readonly cacheKeyPrefix: string;

  private readonly cacheTtlSeconds: number;

  private readonly primaryBreaker: CircuitBreaker;

  private readonly backupBreaker: CircuitBreaker;

  constructor(private readonly options: FailoverRepositoryOptions<TRecord>) {
    this.cacheKeyPrefix = options.cachePrefix ?? options.tableName;
    this.cacheTtlSeconds = options.cacheTtlSeconds ?? 300;
    this.primaryBreaker = options.primaryBreaker ?? new CircuitBreaker({ failureThreshold: 5, cooldownMs: 30000 });
    this.backupBreaker = options.backupBreaker ?? new CircuitBreaker({ failureThreshold: 5, cooldownMs: 30000 });
  }

  private cacheKey(id: string): string {
    return `${this.cacheKeyPrefix}:${id}`;
  }

  private async readFromClient(client: SupabaseClient, id: string): Promise<TRecord | null> {
    const response = await client.from(this.options.tableName).select("*").eq("id", id).maybeSingle();

    if (response.error) {
      throw response.error;
    }

    return (response.data as TRecord | null) ?? null;
  }

  private async upsertToClient(client: SupabaseClient, record: TRecord): Promise<TRecord> {
    const response = await client
      .from(this.options.tableName)
      .upsert(record as never, { onConflict: "id" })
      .select()
      .single();

    if (response.error) {
      throw response.error;
    }

    return response.data as TRecord;
  }

  async getById(id: string): Promise<TRecord | null> {
    const cachedRecord = await this.options.cache.get<TRecord>(this.cacheKey(id));

    if (cachedRecord) {
      return cachedRecord;
    }

    if (this.primaryBreaker.canAttempt()) {
      try {
        const primaryRecord = await this.readFromClient(this.options.primaryClient, id);

        if (primaryRecord) {
          await this.options.cache.set(this.cacheKey(id), primaryRecord, this.cacheTtlSeconds);
        }

        this.primaryBreaker.recordSuccess();
        return primaryRecord;
      } catch {
        this.primaryBreaker.recordFailure();
      }
    }

    if (this.backupBreaker.canAttempt()) {
      try {
        const backupRecord = await this.readFromClient(this.options.backupClient, id);

        if (backupRecord) {
          await this.options.cache.set(this.cacheKey(id), backupRecord, this.cacheTtlSeconds);
        }

        this.backupBreaker.recordSuccess();
        return backupRecord;
      } catch {
        this.backupBreaker.recordFailure();
      }
    }

    return null;
  }

  async upsert(record: TRecord): Promise<TRecord> {
    let resolvedRecord: TRecord | null = null;
    let primaryError: unknown = null;

    if (this.primaryBreaker.canAttempt()) {
      try {
        resolvedRecord = await this.upsertToClient(this.options.primaryClient, record);
        this.primaryBreaker.recordSuccess();
      } catch (error) {
        primaryError = error;
        this.primaryBreaker.recordFailure();
      }
    }

    if (!resolvedRecord && this.backupBreaker.canAttempt()) {
      try {
        resolvedRecord = await this.upsertToClient(this.options.backupClient, record);
        this.backupBreaker.recordSuccess();
      } catch (error) {
        this.backupBreaker.recordFailure();

        if (primaryError) {
          throw primaryError;
        }

        throw error;
      }
    }

    if (!resolvedRecord) {
      throw primaryError ?? new Error(`Unable to persist record in ${this.options.tableName}.`);
    }

    await this.options.cache.set(this.cacheKey(resolvedRecord.id), resolvedRecord, this.cacheTtlSeconds);
    return resolvedRecord;
  }

  async deleteById(id: string): Promise<void> {
    const primaryDelete = this.primaryBreaker.canAttempt()
      ? this.options.primaryClient.from(this.options.tableName).delete().eq("id", id)
      : Promise.resolve({ error: null });

    const backupDelete = this.backupBreaker.canAttempt()
      ? this.options.backupClient.from(this.options.tableName).delete().eq("id", id)
      : Promise.resolve({ error: null });

    const [primaryResult, backupResult] = await Promise.allSettled([primaryDelete, backupDelete]);

    if (primaryResult.status === "fulfilled" && primaryResult.value.error === null) {
      this.primaryBreaker.recordSuccess();
    } else if (primaryResult.status === "rejected" || primaryResult.value.error) {
      this.primaryBreaker.recordFailure();
    }

    if (backupResult.status === "fulfilled" && backupResult.value.error === null) {
      this.backupBreaker.recordSuccess();
    } else if (backupResult.status === "rejected" || backupResult.value.error) {
      this.backupBreaker.recordFailure();
    }

    await this.options.cache.del(this.cacheKey(id));
  }
}
