import { describe, it, expect, beforeEach, vi } from 'vitest';
import { queryCache, getCacheKey, cachedQuery } from '../query-cache';

describe('queryCache', () => {
  beforeEach(() => {
    queryCache.clear();
  });

  it('stores and retrieves a value', () => {
    queryCache.set('foo', 123);
    expect(queryCache.get('foo')).toBe(123);
  });

  it('returns null for missing keys', () => {
    expect(queryCache.get('missing')).toBeNull();
  });

  it('respects TTL and expires entries', () => {
    vi.useFakeTimers();
    queryCache.set('temp', 'v', 1000);
    expect(queryCache.get('temp')).toBe('v');
    vi.advanceTimersByTime(1500);
    expect(queryCache.get('temp')).toBeNull();
    vi.useRealTimers();
  });

  it('has() reflects presence', () => {
    queryCache.set('k', 1);
    expect(queryCache.has('k')).toBe(true);
    queryCache.invalidate('k');
    expect(queryCache.has('k')).toBe(false);
  });

  it('invalidatePattern removes matching keys', () => {
    queryCache.set('company:1.period:202401', 'a');
    queryCache.set('company:1.period:202402', 'b');
    queryCache.set('company:2.period:202401', 'c');
    queryCache.invalidatePattern('company:1');
    expect(queryCache.get('company:1.period:202401')).toBeNull();
    expect(queryCache.get('company:1.period:202402')).toBeNull();
    expect(queryCache.get('company:2.period:202401')).toBe('c');
  });

  it('invalidateCompany only clears its keys', () => {
    queryCache.set('company:1', 1);
    queryCache.set('company:2', 2);
    queryCache.invalidateCompany(1);
    expect(queryCache.get('company:1')).toBeNull();
    expect(queryCache.get('company:2')).toBe(2);
  });

  it('invalidatePeriod scoped to company+period', () => {
    queryCache.set('company:1.period:202401', 'x');
    queryCache.set('company:1.period:202402', 'y');
    queryCache.invalidatePeriod(1, '202401');
    expect(queryCache.get('company:1.period:202401')).toBeNull();
    expect(queryCache.get('company:1.period:202402')).toBe('y');
  });

  it('invalidateYear scoped', () => {
    queryCache.set('company:1.year:2024', 'a');
    queryCache.set('company:1.year:2025', 'b');
    queryCache.invalidateYear(1, 2024);
    expect(queryCache.get('company:1.year:2024')).toBeNull();
    expect(queryCache.get('company:1.year:2025')).toBe('b');
  });

  it('invalidateSales and invalidatePurchases', () => {
    queryCache.set('sales:foo.company:1', 1);
    queryCache.set('purchases:foo.company:1', 2);
    queryCache.invalidateSales(1);
    expect(queryCache.get('sales:foo.company:1')).toBeNull();
    expect(queryCache.get('purchases:foo.company:1')).toBe(2);
    queryCache.invalidatePurchases(1);
    expect(queryCache.get('purchases:foo.company:1')).toBeNull();
  });

  it('clear empties cache', () => {
    queryCache.set('a', 1);
    queryCache.set('b', 2);
    queryCache.clear();
    expect(queryCache.getStats().size).toBe(0);
  });

  it('getStats reports active and expired', () => {
    vi.useFakeTimers();
    queryCache.set('alive', 1, 60_000);
    queryCache.set('dead', 1, 1000);
    vi.advanceTimersByTime(2000);
    const stats = queryCache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.expired).toBe(1);
    expect(stats.active).toBe(1);
    vi.useRealTimers();
  });

  it('cleanup removes expired entries', () => {
    vi.useFakeTimers();
    queryCache.set('x', 1, 1000);
    vi.advanceTimersByTime(2000);
    queryCache.cleanup();
    expect(queryCache.getStats().size).toBe(0);
    vi.useRealTimers();
  });
});

describe('getCacheKey', () => {
  it('produces deterministic keys regardless of param order', () => {
    const a = getCacheKey('prefix', { b: 1, a: 2 });
    const b = getCacheKey('prefix', { a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it('includes prefix and params', () => {
    expect(getCacheKey('sales', { company: 1, period: '202401' })).toContain('sales|');
    expect(getCacheKey('sales', { company: 1 })).toContain('company:1');
  });
});

describe('cachedQuery', () => {
  beforeEach(() => queryCache.clear());

  it('runs query on miss and caches result', async () => {
    const fn = vi.fn(async () => 'data');
    const first = await cachedQuery('k1', fn);
    const second = await cachedQuery('k1', fn);
    expect(first).toBe('data');
    expect(second).toBe('data');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
