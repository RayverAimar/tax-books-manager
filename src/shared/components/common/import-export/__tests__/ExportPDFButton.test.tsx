import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportPDFButton } from '../ExportPDFButton';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { aSalesInvoice } from '@/test/helpers/factories';
import type { PeriodSummaryData } from '@/shared/lib/export/pdf-export';

const data: PeriodSummaryData = {
  ruc: '20100070970',
  businessName: 'EMPRESA',
  registryType: 'RVIE',
  period: '2025/01',
  isDeclared: false,
  recordCount: 1,
  totals: { taxableBase: 100, vatTotal: 18, totalAmount: 118 }
};

describe('ExportPDFButton', () => {
  beforeEach(() => {
    vi.mocked(save).mockReset();
    vi.mocked(writeFile).mockReset();
    global.fetch = vi.fn(async () => {
      throw new Error('no logo');
    }) as unknown as typeof fetch;
  });

  it('renderiza el botón y respeta disabled', () => {
    render(<ExportPDFButton onCalculateData={() => data} invoices={[aSalesInvoice()]} disabled />);
    expect(screen.getByText('Descargar Reporte').closest('button')).toBeDisabled();
  });

  it('cuando onCalculateData devuelve undefined muestra error', async () => {
    render(<ExportPDFButton onCalculateData={() => undefined} invoices={[]} />);
    fireEvent.click(screen.getByText('Descargar Reporte'));
    await waitFor(() => expect(save).not.toHaveBeenCalled());
  });

  it('flujo completo guarda archivo', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/r.pdf');
    vi.mocked(writeFile).mockResolvedValueOnce(undefined);
    render(<ExportPDFButton onCalculateData={() => data} invoices={[aSalesInvoice()]} />);
    fireEvent.click(screen.getByText('Descargar Reporte'));
    await waitFor(() => expect(writeFile).toHaveBeenCalled());
  });
});
