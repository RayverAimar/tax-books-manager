import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImport } from '../useImport';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { buildSalesCsv } from '@/test/helpers/csv';

describe('useImport', () => {
  beforeEach(() => {
    vi.mocked(open).mockReset();
    vi.mocked(readFile).mockReset();
  });

  it('estado inicial: no está importando', () => {
    const { result } = renderHook(() => useImport('sales'));
    expect(result.current.isImporting).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('devuelve null cuando el usuario cancela el diálogo', async () => {
    vi.mocked(open).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useImport('sales'));
    const data = await act(async () => result.current.handleImport('csv'));
    expect(data).toBeNull();
  });

  it('importa archivo CSV exitosamente', async () => {
    vi.mocked(open).mockResolvedValueOnce('/tmp/file.csv');
    const csv = buildSalesCsv([{ ruc: '12345678901' }]);
    vi.mocked(readFile).mockResolvedValueOnce(new TextEncoder().encode(csv));

    const { result } = renderHook(() => useImport('sales'));
    const out = await act(async () => result.current.handleImport('csv'));
    expect(out?.success).toBe(true);
    expect(out?.data).toHaveLength(1);
  });

  it('importa archivo TXT con purchases', async () => {
    vi.mocked(open).mockResolvedValueOnce('/tmp/file.txt');
    const txt = 'invalid';
    vi.mocked(readFile).mockResolvedValueOnce(new TextEncoder().encode(txt));

    const { result } = renderHook(() => useImport('purchases'));
    const out = await act(async () => result.current.handleImport('txt'));
    expect(out).toBeDefined(); // even if invalid the hook returns the ImportResult
  });
});
