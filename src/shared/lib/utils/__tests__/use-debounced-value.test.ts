import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from '../use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna el valor inicial inmediatamente', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 200));
    expect(result.current).toBe('a');
  });

  it('emite el último valor tras delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), {
      initialProps: { v: 'a' }
    });
    rerender({ v: 'b' });
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(250));
    expect(result.current).toBe('b');
  });

  it('reinicia el timer si el valor sigue cambiando', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), {
      initialProps: { v: 'a' }
    });
    rerender({ v: 'b' });
    act(() => vi.advanceTimersByTime(150));
    rerender({ v: 'c' });
    act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe('a'); // still pending
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('c');
  });
});
