import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheGet, cacheSet, TTL } from './cache';

beforeEach(() => {
  localStorage.clear();
});

// ── cacheSet / cacheGet ─────────────────────────────────────

describe('cache', () => {
  it('stores and retrieves a value before TTL expiry', () => {
    cacheSet('test-key', { foo: 'bar' }, TTL.hour);
    expect(cacheGet<{ foo: string }>('test-key')).toEqual({ foo: 'bar' });
  });

  it('returns null for a missing key', () => {
    expect(cacheGet('nonexistent')).toBeNull();
  });

  it('returns null and removes the key after TTL expiry', () => {
    vi.useFakeTimers();
    cacheSet('expire-key', 'value', 100);
    expect(cacheGet('expire-key')).toBe('value');

    vi.advanceTimersByTime(101);
    expect(cacheGet('expire-key')).toBeNull();
    expect(localStorage.getItem('expire-key')).toBeNull();

    vi.useRealTimers();
  });

  it('handles values of various types', () => {
    cacheSet('number', 42, TTL.hour);
    cacheSet('string', 'hello', TTL.hour);
    cacheSet('array', [1, 2, 3], TTL.hour);

    expect(cacheGet<number>('number')).toBe(42);
    expect(cacheGet<string>('string')).toBe('hello');
    expect(cacheGet<number[]>('array')).toEqual([1, 2, 3]);
  });

  it('returns null for corrupted JSON', () => {
    localStorage.setItem('broken', '{{invalid json}}');
    expect(cacheGet('broken')).toBeNull();
  });

  it('silently handles localStorage errors (quota / private mode)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    // Should not throw
    expect(() => cacheSet('key', 'value', TTL.hour)).not.toThrow();
    setItemSpy.mockRestore();
  });
});

// ── TTL constants ───────────────────────────────────────────

describe('TTL', () => {
  it('hour is 3_600_000 ms', () => {
    expect(TTL.hour).toBe(3_600_000);
  });

  it('day is 86_400_000 ms', () => {
    expect(TTL.day).toBe(86_400_000);
  });

  it('week is 604_800_000 ms', () => {
    expect(TTL.week).toBe(604_800_000);
  });
});
