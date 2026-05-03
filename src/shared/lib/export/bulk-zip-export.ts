import JSZip from 'jszip';
import { exportSalesCSV, exportPurchasesCSV, exportSalesTXT, exportPurchasesTXT } from './generic-export';
import { exportSalesExcel, exportPurchasesExcel } from './excel-export';
import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';

/**
 * Export format type
 */
export type BulkExportFormat = 'csv' | 'txt' | 'excel';

/**
 * Period data for export
 */
export interface PeriodExportData {
  period: string;
  salesRecords: SalesInvoice[];
  purchaseRecords: PurchaseInvoice[];
}

/**
 * Result of bulk export operation
 */
export interface BulkExportResult {
  success: boolean;
  periodsExported: number;
  salesFilesCreated: number;
  purchasesFilesCreated: number;
  zipBlob?: Blob;
  errors: string[];
}

/**
 * Generate file extension based on format
 */
function getFileExtension(format: BulkExportFormat): string {
  switch (format) {
    case 'csv':
      return 'csv';
    case 'txt':
      return 'txt';
    case 'excel':
      return 'xlsx';
  }
}

/**
 * Export sales records to the specified format
 */
function exportSalesData(records: SalesInvoice[], format: BulkExportFormat): string | ArrayBuffer {
  switch (format) {
    case 'csv':
      return exportSalesCSV(records);
    case 'txt':
      return exportSalesTXT(records);
    case 'excel':
      return exportSalesExcel(records);
  }
}

/**
 * Export purchase records to the specified format
 */
function exportPurchasesData(records: PurchaseInvoice[], format: BulkExportFormat): string | ArrayBuffer {
  switch (format) {
    case 'csv':
      return exportPurchasesCSV(records);
    case 'txt':
      return exportPurchasesTXT(records);
    case 'excel':
      return exportPurchasesExcel(records);
  }
}

/**
 * Create a ZIP file with historical data
 *
 * Structure:
 * - datos-historicos.zip
 *   ├── compras/
 *   │   ├── 202408.csv
 *   │   ├── 202409.csv
 *   │   └── ...
 *   └── ventas/
 *       ├── 202408.csv
 *       ├── 202409.csv
 *       └── ...
 */
export async function createBulkExportZip(
  periodsData: PeriodExportData[],
  format: BulkExportFormat
): Promise<BulkExportResult> {
  const result: BulkExportResult = {
    success: false,
    periodsExported: 0,
    salesFilesCreated: 0,
    purchasesFilesCreated: 0,
    errors: []
  };

  try {
    const zip = new JSZip();
    const extension = getFileExtension(format);

    // Create folders
    const comprasFolder = zip.folder('compras');
    const ventasFolder = zip.folder('ventas');

    if (!comprasFolder || !ventasFolder) {
      throw new Error('Error al crear carpetas en el ZIP');
    }

    // Process each period
    for (const periodData of periodsData) {
      try {
        // Export sales if there are records
        if (periodData.salesRecords && periodData.salesRecords.length > 0) {
          const salesContent = exportSalesData(periodData.salesRecords, format);
          const salesFileName = `${periodData.period}.${extension}`;

          if (typeof salesContent === 'string') {
            ventasFolder.file(salesFileName, salesContent);
          } else {
            ventasFolder.file(salesFileName, salesContent);
          }

          result.salesFilesCreated++;
        }

        // Export purchases if there are records
        if (periodData.purchaseRecords && periodData.purchaseRecords.length > 0) {
          const purchasesContent = exportPurchasesData(periodData.purchaseRecords, format);
          const purchasesFileName = `${periodData.period}.${extension}`;

          if (typeof purchasesContent === 'string') {
            comprasFolder.file(purchasesFileName, purchasesContent);
          } else {
            comprasFolder.file(purchasesFileName, purchasesContent);
          }

          result.purchasesFilesCreated++;
        }

        result.periodsExported++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        result.errors.push(`Error al procesar período ${periodData.period}: ${errorMsg}`);
      }
    }

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    result.zipBlob = zipBlob;
    result.success = result.errors.length === 0 && result.periodsExported > 0;

    return result;
  } catch (error) {
    result.errors.push(
      `Error al generar el archivo ZIP: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
    return result;
  }
}
