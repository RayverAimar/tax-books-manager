import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { aSalesInvoice, aPurchaseInvoice } from '@/test/helpers/factories';

vi.mock('@/core/presentation/contexts/company.context', () => ({
  useCompany: () => ({ company: { ruc: '20131312955', businessName: 'TEST' } })
}));

vi.mock('@/core/presentation/contexts/period.context', () => ({
  usePeriod: () => ({ selectedPeriod: '202401' })
}));

const { useExport, SireValidationError } = await import('../useExport');

describe('useExport', () => {
  beforeEach(() => {
    vi.mocked(save).mockReset();
    vi.mocked(writeFile).mockReset();
  });

  it('estado inicial', () => {
    const { result } = renderHook(() => useExport('sales'));
    expect(result.current.isExporting).toBe(false);
  });

  it('devuelve null si se cancela el save dialog', async () => {
    vi.mocked(save).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useExport('sales', '202401'));
    const out = await act(async () => result.current.handleExport([aSalesInvoice()], 'csv'));
    expect(out).toBeNull();
  });

  it('exporta CSV de ventas', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/x.csv');
    vi.mocked(writeFile).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useExport('sales', '202401'));
    const out = await act(async () => result.current.handleExport([aSalesInvoice()], 'csv'));
    expect(out).toBe('/tmp/x.csv');
    expect(writeFile).toHaveBeenCalled();
  });

  it('exporta TXT de compras', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/x.txt');
    const { result } = renderHook(() => useExport('purchases', '202401'));
    const out = await act(async () => result.current.handleExport([aPurchaseInvoice()], 'txt'));
    expect(out).toBe('/tmp/x.txt');
  });

  it('TXT bloquea export si la validación SIRE falla', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/x.txt');
    const invalidInvoice = aSalesInvoice({ ruc: 'BAD' });
    const { result } = renderHook(() => useExport('sales', '202401'));
    let captured: unknown = null;
    try {
      await act(async () => {
        await result.current.handleExport([invalidInvoice], 'txt');
      });
    } catch (err) {
      captured = err;
    }
    expect(captured).toBeInstanceOf(SireValidationError);
    const err = captured as InstanceType<typeof SireValidationError>;
    expect(err.validation.totalErrors).toBeGreaterThan(0);
    expect(err.validation.ok).toBe(false);
    // No debe haber escrito el archivo si la validación falló
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('CSV no aplica validación SIRE (uso interno)', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/x.csv');
    vi.mocked(writeFile).mockResolvedValueOnce(undefined);
    const invalidInvoice = aSalesInvoice({ ruc: 'BAD' });
    const { result } = renderHook(() => useExport('sales', '202401'));
    const out = await act(async () => result.current.handleExport([invalidInvoice], 'csv'));
    expect(out).toBe('/tmp/x.csv');
  });
});
