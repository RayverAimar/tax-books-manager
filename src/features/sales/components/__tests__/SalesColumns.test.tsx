import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSalesColumns } from '../SalesColumns';
import { usePurchasesColumns } from '@/features/purchases/components/PurchasesColumns';

describe('useSalesColumns', () => {
  it('genera columnas para sales con id incluido', () => {
    const { result } = renderHook(() => useSalesColumns());
    expect(result.current.length).toBeGreaterThan(20);
    expect(result.current.some((c) => 'accessorKey' in c && c.accessorKey === 'ruc')).toBe(true);
  });
});

describe('usePurchasesColumns', () => {
  it('genera columnas para purchases con free use fields', () => {
    const { result } = renderHook(() => usePurchasesColumns());
    expect(result.current.length).toBeGreaterThan(60);
  });
});
