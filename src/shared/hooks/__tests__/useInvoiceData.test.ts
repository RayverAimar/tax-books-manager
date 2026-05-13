import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInvoiceData } from '../useInvoiceData';
import { aSalesInvoice } from '@/test/helpers/factories';

describe('useInvoiceData', () => {
  it('estado inicial vacío', () => {
    const { result } = renderHook(() => useInvoiceData('sales'));
    expect(result.current.invoices).toEqual([]);
  });

  it('initializeData carga la lista', () => {
    const { result } = renderHook(() => useInvoiceData('sales'));
    act(() => result.current.initializeData([aSalesInvoice({ id: 1 })]));
    expect(result.current.invoices).toHaveLength(1);
  });

  it('addInvoice agrega y devuelve id negativo', () => {
    const { result } = renderHook(() => useInvoiceData('sales'));
    let inv: ReturnType<typeof result.current.addInvoice>;
    act(() => {
      inv = result.current.addInvoice(aSalesInvoice());
    });
    expect(result.current.invoices).toHaveLength(1);
    expect(inv!.id).toBeLessThan(0);
  });

  it('updateInvoice modifica el campo', () => {
    const { result } = renderHook(() => useInvoiceData('sales'));
    act(() => result.current.initializeData([aSalesInvoice({ id: 1, ruc: 'A' })]));
    act(() => result.current.updateInvoice(1, { ruc: 'B' }));
    expect(result.current.invoices[0].ruc).toBe('B');
  });

  it('deleteInvoice y deleteMultipleInvoices', () => {
    const { result } = renderHook(() => useInvoiceData('sales'));
    act(() =>
      result.current.initializeData([aSalesInvoice({ id: 1 }), aSalesInvoice({ id: 2 }), aSalesInvoice({ id: 3 })])
    );
    act(() => result.current.deleteInvoice(1));
    act(() => result.current.deleteMultipleInvoices([2, 3]));
    expect(result.current.invoices).toHaveLength(0);
  });

  it('replaceAll y appendAll', () => {
    const { result } = renderHook(() => useInvoiceData('sales'));
    act(() => result.current.replaceAll([aSalesInvoice({ id: 1 })]));
    expect(result.current.invoices).toHaveLength(1);
    act(() => result.current.appendAll([aSalesInvoice({ id: 2 })]));
    expect(result.current.invoices).toHaveLength(2);
  });

  it('getInvoiceById', () => {
    const { result } = renderHook(() => useInvoiceData('sales'));
    act(() => result.current.initializeData([aSalesInvoice({ id: 7 })]));
    expect(result.current.getInvoiceById(7)?.id).toBe(7);
    expect(result.current.getInvoiceById(999)).toBeUndefined();
  });

  it('setInvoices directo funciona', () => {
    const { result } = renderHook(() => useInvoiceData('sales'));
    act(() => result.current.setInvoices([aSalesInvoice()]));
    expect(result.current.invoices).toHaveLength(1);
  });
});
