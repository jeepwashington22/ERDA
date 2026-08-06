export type CircuitBreakerState = "closed" | "open" | "half-open";

type CircuitBreakerOptions = {
  failureThreshold: number;
  cooldownMs: number;
};

export class CircuitBreaker {
  private failureCount = 0;

  private openedAt = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  get state(): CircuitBreakerState {
    if (this.openedAt === 0) {
      return "closed";
    }

    if (Date.now() - this.openedAt >= this.options.cooldownMs) {
      return "half-open";
    }

    return "open";
  }

  canAttempt(): boolean {
    return this.state !== "open";
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.openedAt = 0;
  }

  recordFailure(): void {
    this.failureCount += 1;

    if (this.failureCount >= this.options.failureThreshold) {
      this.openedAt = Date.now();
    }
  }

  snapshot() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      openedAt: this.openedAt,
    };
  }
}
