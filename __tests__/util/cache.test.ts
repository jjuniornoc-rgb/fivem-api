import { TtlCache } from '../../src/util/cache';

describe('TtlCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns undefined for missing key', () => {
    const cache = new TtlCache<string, number>(1000);
    expect(cache.get('a')).toBeUndefined();
  });

  it('returns value after set', () => {
    const cache = new TtlCache<string, number>(1000);
    cache.set('a', 42);
    expect(cache.get('a')).toBe(42);
  });

  it('returns undefined after TTL expires', () => {
    const cache = new TtlCache<string, number>(1000);
    cache.set('a', 42);
    jest.advanceTimersByTime(999);
    expect(cache.get('a')).toBe(42);
    jest.advanceTimersByTime(2);
    expect(cache.get('a')).toBeUndefined();
  });

  it('delete removes entry', () => {
    const cache = new TtlCache<string, string>(1000);
    cache.set('k', 'v');
    expect(cache.delete('k')).toBe(true);
    expect(cache.get('k')).toBeUndefined();
    expect(cache.delete('k')).toBe(false);
  });

  it('clear removes all entries', () => {
    const cache = new TtlCache<string, number>(1000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
