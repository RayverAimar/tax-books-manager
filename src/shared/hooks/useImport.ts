import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { importSalesCSV, importSalesTXT } from '@/features/sales/lib/sales-import';
import { importPurchasesCSV, importPurchasesTXT } from '@/features/purchases/lib/purchases-import';
import type { InvoiceType, InvoiceMap } from '@/shared/types/invoice.types';
import type { ImportResult } from '@/shared/lib/import/import-types';
import { decodeFileBytes } from '@/shared/lib/utils/encoding';

export function useImport<T extends InvoiceType>(type: T) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImport = async (format: 'csv' | 'txt'): Promise<ImportResult<InvoiceMap<T>> | null> => {
    try {
      setIsImporting(true);
      setProgress(10);

      // Determine allowed extensions based on format
      const extensions = format === 'csv' ? ['csv'] : ['txt'];

      // Open file dialog
      const filePath = await open({
        multiple: false,
        filters: [
          {
            name: format === 'csv' ? 'Archivos CSV' : 'Archivos TXT',
            extensions
          }
        ]
      });

      if (!filePath) {
        setIsImporting(false);
        return null;
      }

      setProgress(30);

      // Read file
      const fileContent = await readFile(filePath as string);
      setProgress(50);

      // Decode content with auto-detection (UTF-8 strict, fallback to Windows-1252
      // for files exported by sistemas contables como Concar o Excel ES en Windows)
      const { text: textContent } = decodeFileBytes(fileContent);

      let result: ImportResult<InvoiceMap<T>>;

      // Call appropriate import function based on type AND format
      // CSV files use comma delimiter, TXT files use pipe delimiter
      if (type === 'sales') {
        result =
          format === 'csv'
            ? ((await importSalesCSV(textContent)) as ImportResult<InvoiceMap<T>>)
            : ((await importSalesTXT(textContent)) as ImportResult<InvoiceMap<T>>);
      } else {
        result =
          format === 'csv'
            ? ((await importPurchasesCSV(textContent)) as ImportResult<InvoiceMap<T>>)
            : ((await importPurchasesTXT(textContent)) as ImportResult<InvoiceMap<T>>);
      }

      setProgress(100);
      setIsImporting(false);

      return result;
    } catch (error) {
      setIsImporting(false);

      return {
        success: false,
        data: [],
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
        warnings: []
      };
    }
  };

  return {
    handleImport,
    isImporting,
    progress
  };
}
