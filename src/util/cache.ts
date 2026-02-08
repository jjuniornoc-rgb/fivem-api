interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class TtlCache<K = string, V = unknown> {
  private readonly ttlMs: number;
  private readonly store = new Map<K, CacheEntry<V>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ttlMs: number, autoCleanup = true) {
    this.ttlMs = ttlMs;
    if (autoCleanup) {
      this.cleanupInterval = setInterval(() => this.prune(), 60000);
    }
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: K, value: V): void {
    this.store.set(key, {
      data: value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}
