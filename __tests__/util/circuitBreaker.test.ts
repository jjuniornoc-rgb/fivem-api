import { CircuitBreaker } from '../../src/util/circuitBreaker';

describe('CircuitBreaker', () => {
  it('starts closed', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 100 });
    expect(cb.getState()).toBe('closed');
  });

  it('opens after failureThreshold failures', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
    cb.recordFailure();
    expect(cb.getState()).toBe('closed');
    cb.recordFailure();
    expect(cb.getState()).toBe('open');
    expect(() => cb.guard()).toThrow('CircuitBreaker open');
  });

  it('recordSuccess resets failures', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.getState()).toBe('closed');
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('closed');
  });

  it('execute returns result and records success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
    const result = await cb.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('execute records failure and rethrows', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    cb.recordFailure();
    expect(cb.getState()).toBe('open');
  });
});
