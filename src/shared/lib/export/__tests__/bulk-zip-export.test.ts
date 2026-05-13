import { describe, it, expect } from 'vitest';
import { createBulkExportZip } from '../bulk-zip-export';
import { aSalesInvoice, aPurchaseInvoice } from '@/test/helpers/factories';

describe('createBulkExportZip', () => {
  it('genera ZIP con datos de ambas categorías en CSV', async () => {
    const out = await createBulkExportZip(
      [
        {
          period: '202408',
          salesRecords: [aSalesInvoice()],
          purchaseRecords: [aPurchaseInvoice()]
        }
      ],
      'csv'
    );
    expect(out.success).toBe(true);
    expect(out.salesFilesCreated).toBe(1);
    expect(out.purchasesFilesCreated).toBe(1);
    expect(out.zipBlob).toBeInstanceOf(Blob);
  });

  it('TXT también produce ZIP', async () => {
    const out = await createBulkExportZip(
      [{ period: '202408', salesRecords: [aSalesInvoice()], purchaseRecords: [] }],
      'txt'
    );
    expect(out.success).toBe(true);
    expect(out.salesFilesCreated).toBe(1);
    expect(out.purchasesFilesCreated).toBe(0);
  });

  it('omite periodos sin registros', async () => {
    const out = await createBulkExportZip([{ period: '202408', salesRecords: [], purchaseRecords: [] }], 'csv');
    expect(out.salesFilesCreated).toBe(0);
    expect(out.purchasesFilesCreated).toBe(0);
  });
});
