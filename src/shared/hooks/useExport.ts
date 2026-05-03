import { useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import {
  exportSalesCSV,
  exportPurchasesCSV,
  exportSalesTXT,
  exportPurchasesTXT
} from '@/shared/lib/export/generic-export';
import { exportSalesExcel, exportPurchasesExcel } from '@/shared/lib/export/excel-export';
import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';
import type { InvoiceType, ExportFormat } from '@/shared/types/invoice.types';

export function useExport(type: InvoiceType, period?: string) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (
    invoices: SalesInvoice[] | PurchaseInvoice[],
    format: ExportFormat
  ): Promise<string | null> => {
    try {
      setIsExporting(true);

      // Determine extension and filters
      let extension: string;
      let filterName: string;

      switch (format) {
        case 'csv':
          extension = 'csv';
          filterName = 'CSV';
          break;
        case 'txt':
          extension = 'txt';
          filterName = 'TXT';
          break;
        case 'excel':
          extension = 'xlsx';
          filterName = 'Excel';
          break;
      }

      // Generate default file name: libro_<ventas/compras>_<period>
      const bookType = type === 'sales' ? 'ventas' : 'compras';
      const periodSuffix = period ? `_${period.replace('/', '')}` : '';
      const defaultFileName = `libro_${bookType}${periodSuffix}.${extension}`;

      // Open save dialog
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [
          {
            name: filterName,
            extensions: [extension]
          }
        ]
      });

      if (!filePath) {
        setIsExporting(false);
        return null;
      }

      // Generate content based on format
      let content: string | ArrayBuffer;

      if (format === 'csv') {
        if (type === 'sales') {
          content = exportSalesCSV(invoices as SalesInvoice[]);
        } else {
          content = exportPurchasesCSV(invoices as PurchaseInvoice[]);
        }
      } else if (format === 'txt') {
        if (type === 'sales') {
          content = exportSalesTXT(invoices as SalesInvoice[]);
        } else {
          content = exportPurchasesTXT(invoices as PurchaseInvoice[]);
        }
      } else {
        if (type === 'sales') {
          content = exportSalesExcel(invoices as SalesInvoice[]);
        } else {
          content = exportPurchasesExcel(invoices as PurchaseInvoice[]);
        }
      }

      // Write file
      if (typeof content === 'string') {
        await writeFile(filePath, new TextEncoder().encode(content));
      } else {
        await writeFile(filePath, new Uint8Array(content));
      }

      setIsExporting(false);
      return filePath;
    } catch (error) {
      setIsExporting(false);
      throw error;
    }
  };

  return {
    handleExport,
    isExporting
  };
}
