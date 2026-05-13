import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSunatPeriodReport, downloadSunatPeriodReport, type PeriodSummaryData } from '../pdf-export';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

const baseData: PeriodSummaryData = {
  ruc: '20100070970',
  businessName: 'EMPRESA EJEMPLO SAC',
  registryType: 'RVIE',
  period: '2024/08',
  isDeclared: true,
  recordCount: 5,
  totals: {
    taxableBase: 1000,
    vatTotal: 180,
    totalAmount: 1180,
    vatBreakdown: [
      { rate: 18, amount: 180 },
      { rate: 10, amount: 0 }
    ]
  }
};

describe('generateSunatPeriodReport', () => {
  it('genera un Blob no vacío para ventas (RVIE)', () => {
    const blob = generateSunatPeriodReport(baseData);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('genera un Blob para compras (RVCE)', () => {
    const blob = generateSunatPeriodReport({
      ...baseData,
      registryType: 'RVCE',
      totals: {
        taxableBasePurchases: 800,
        vatPurchases: 144,
        nonTaxableAmount: 50,
        totalAmount: 994
      }
    });
    expect(blob.size).toBeGreaterThan(0);
  });

  it('acepta logoImageData undefined', () => {
    const blob = generateSunatPeriodReport(baseData, undefined);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('respeta isDeclared=false', () => {
    const blob = generateSunatPeriodReport({ ...baseData, isDeclared: false });
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('downloadSunatPeriodReport', () => {
  beforeEach(() => {
    vi.mocked(save).mockReset();
    vi.mocked(writeFile).mockReset();
  });

  it('devuelve null cuando el usuario cancela', async () => {
    vi.mocked(save).mockResolvedValueOnce(null);
    const out = await downloadSunatPeriodReport(baseData);
    expect(out).toBeNull();
  });

  it('escribe archivo y devuelve la ruta cuando se confirma', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/r.pdf');
    vi.mocked(writeFile).mockResolvedValueOnce(undefined);
    // fetch failing → logo is undefined, the rest still works
    global.fetch = vi.fn(async () => {
      throw new Error('no logo');
    }) as unknown as typeof fetch;

    const out = await downloadSunatPeriodReport(baseData, 'custom-name');
    expect(out).toBe('/tmp/r.pdf');
    expect(writeFile).toHaveBeenCalled();
  });
});
