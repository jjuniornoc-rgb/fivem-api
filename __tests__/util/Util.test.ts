import { flatten, timeoutPromise } from '../../src/util/Util';

describe('Util', () => {
  describe('flatten', () => {
    it('returns non-object unchanged', () => {
      expect(flatten(42)).toBe(42);
      expect(flatten('hello')).toBe('hello');
      expect(flatten(null)).toBe(null);
    });

    it('flattens plain object', () => {
      const obj = { a: 1, b: 2 };
      expect(flatten(obj)).toEqual({ a: 1, b: 2 });
    });

    it('ignores keys starting with _', () => {
      const obj = { a: 1, _private: 2 };
      const result = flatten(obj) as Record<string, unknown>;
      expect(result.a).toBe(1);
      expect(result._private).toBeUndefined();
    });

    it('renames keys with props', () => {
      const obj = { name: 'x', id: 1 };
      const result = flatten(obj, { name: 'displayName', id: true }) as Record<string, unknown>;
      expect(result.displayName).toBe('x');
      expect(result.id).toBe(1);
    });
  });

  describe('timeoutPromise', () => {
    it('resolves when promise resolves before timeout', async () => {
      const result = await timeoutPromise(Promise.resolve(42), 1000);
      expect(result).toBe(42);
    });

    it('rejects with TIMEOUT when promise is slow', async () => {
      // Promise that never resolves; only the 50ms timeout runs and rejects (no extra timer left)
      const neverResolves = new Promise<number>(() => {});
      await expect(timeoutPromise(neverResolves, 50)).rejects.toThrow('TIMEOUT');
    });
  });
});
