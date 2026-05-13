import { useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import {
  exportSalesCSV,
  exportPurchasesCSV,
  exportSalesTXT,
  exportPurchasesTXT
} from '@/shared/lib/export/generic-export';
import { buildSireFileName, type SireOpportunity } from '@/shared/lib/export/sire-filename';
import {
  validateForPvsire,
  type PvsireBatchResult
} from '@/shared/lib/export/pvsire-row-validator';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { usePeriod } from '@/core/presentation/contexts/period.context';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';
import type { InvoiceType, ExportFormat } from '@/shared/types/invoice.types';

/**
 * Error lanzado cuando el archivo a exportar como TXT SIRE no pasa la validación
 * PVSIRE-parity. `validation` tiene el detalle accionable para mostrar al usuario.
 */
export class SireValidationError extends Error {
  constructor(public readonly validation: PvsireBatchResult) {
    const rowsWithErrors = validation.rowResults.filter((r) => !r.result.ok).length;
    super(`Validación PVSIRE falló: ${validation.totalErrors} errores en ${rowsWithErrors} filas`);
    this.name = 'SireValidationError';
  }
}

export function useExport(type: InvoiceType, period?: string) {
  const { company } = useCompany();
  const { selectedPeriod } = usePeriod();
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Opciones SIRE para TXT. Solo aplican cuando format === 'txt'.
   *   - opportunity '01' = Acepta propuesta
   *   - opportunity '02' = Reemplaza propuesta (default; caso más común)
   *   - opportunity '03'/'04'/'05' = Ajustes posteriores/anteriores (requieren correlative)
   */
  const handleExport = async (
    invoices: SalesInvoice[] | PurchaseInvoice[],
    format: ExportFormat,
    sireOptions?: { opportunity?: SireOpportunity; correlative?: string }
  ): Promise<string | null> => {
    try {
      setIsExporting(true);

      // TXT es el archivo oficial SIRE — validar contra PVSIRE-parity antes de generar.
      // El validador aplica TODAS las reglas que PVSIRE 1.7.0 chequea offline:
      // tipos de comprobante, longitudes, regex, doc identidad con módulo 11,
      // moneda contra tabla oficial, coherencia BI/IGV, doc modificado (NC/ND), etc.
      if (format === 'txt') {
        const periodToUse = period ?? selectedPeriod ?? '';
        const validation = validateForPvsire(invoices, type, periodToUse);
        if (!validation.ok) {
          setIsExporting(false);
          throw new SireValidationError(validation);
        }
      }

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
      }

      // TXT usa el formato oficial SIRE (es el que se sube al SOL).
      // opportunity '02' (reemplaza propuesta) por defecto — caso más común.
      // El caller puede pedir '03'/'04'/'05' (ajustes) pasando correlative.
      let defaultFileName: string;
      if (format === 'txt' && company?.ruc && period) {
        defaultFileName = buildSireFileName({
          ruc: company.ruc,
          period,
          type,
          opportunity: sireOptions?.opportunity ?? '02',
          correlative: sireOptions?.correlative
        });
      } else {
        const bookType = type === 'sales' ? 'ventas' : 'compras';
        const periodSuffix = period ? `_${period.replace('/', '')}` : '';
        defaultFileName = `libro_${bookType}${periodSuffix}.${extension}`;
      }

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
      let content: string;

      if (format === 'csv') {
        if (type === 'sales') {
          content = exportSalesCSV(invoices as SalesInvoice[]);
        } else {
          content = exportPurchasesCSV(invoices as PurchaseInvoice[]);
        }
      } else {
        if (type === 'sales') {
          content = exportSalesTXT(invoices as SalesInvoice[]);
        } else {
          content = exportPurchasesTXT(invoices as PurchaseInvoice[]);
        }
      }

      const bytes = new TextEncoder().encode(content);
      await writeFile(filePath, bytes);

      // Auditoría: hash SHA-256 + insert en export_history. Si el insert falla,
      // no propagamos el error — el archivo ya se generó correctamente.
      try {
        const periodToUse = period ?? selectedPeriod ?? '';
        if (company?.id && periodToUse) {
          const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
          const fileHash = Array.from(new Uint8Array(hashBuf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
          const fileName = filePath.split('/').pop() ?? filePath.split('\\').pop() ?? filePath;
          await RepositoryFactory.getExportHistoryRepository().create({
            companyId: company.id,
            type,
            period: periodToUse,
            format,
            opportunity: sireOptions?.opportunity ?? null,
            correlative: sireOptions?.correlative ?? null,
            recordCount: invoices.length,
            fileName,
            filePath,
            fileHash
          });
        }
      } catch (auditErr) {
        console.warn('[useExport] No se pudo registrar export_history:', auditErr);
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
