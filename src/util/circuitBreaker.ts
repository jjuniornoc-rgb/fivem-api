import type { CircuitBreakerOptions } from '../types';

export type CircuitState = 'closed' | 'open' | 'half-open';

const DEFAULT_OPTS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  cooldownMs: 30000,
};

/**
 * Simple in-memory circuit breaker: after N consecutive failures, opens and
 * rejects immediately until cooldown passes, then allows one call (half-open).
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastOpenAt = 0;
  private readonly opts: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions | boolean = true) {
    this.opts =
      options === true
        ? DEFAULT_OPTS
        : { ...DEFAULT_OPTS, ...(typeof options === 'object' ? options : {}) };
  }

  getState(): CircuitState {
    if (this.state !== 'open') return this.state;
    const elapsed = Date.now() - this.lastOpenAt;
    if (elapsed >= this.opts.cooldownMs) {
      this.state = 'half-open';
      this.failures = 0;
    }
    return this.state;
  }

  /** Call before executing the guarded operation. Throws if circuit is open. */
  guard(): void {
    const s = this.getState();
    if (s === 'open') {
      throw new Error('CircuitBreaker open');
    }
  }

  /** Call after success: resets failure count and closes if half-open. */
  recordSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') this.state = 'closed';
  }

  /** Call after failure: increments count and opens if threshold reached. */
  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.opts.failureThreshold) {
      this.state = 'open';
      this.lastOpenAt = Date.now();
    }
  }

  /** Execute fn with guard: on failure records and rethrows; on success records and returns. */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.guard();
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }
}
