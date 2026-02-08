import type { CircuitBreakerOptions } from '../types';

export type CircuitState = 'closed' | 'open' | 'half-open';

const DEFAULT_OPTS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  cooldownMs: 30000,
};

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

  guard(): void {
    const s = this.getState();
    if (s === 'open') {
      throw new Error('CircuitBreaker open');
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') this.state = 'closed';
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.opts.failureThreshold) {
      this.state = 'open';
      this.lastOpenAt = Date.now();
    }
  }

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
