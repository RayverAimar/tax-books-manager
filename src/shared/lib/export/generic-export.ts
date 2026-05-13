/**
 * Generic CSV/TXT export utilities
 * Eliminates duplication between sales and purchases export logic
 */

/**
 * Formats a value for CSV or TXT export with proper type handling
 *
 * This function ensures consistent formatting of different data types for export,
 * handling edge cases like null values, dates, numbers, and strings with special
 * characters. It's the core formatting function used by all export utilities.
 *
 * Type-specific formatting:
 * - null/undefined/empty: Returns empty string (not "null" or "undefined")
 * - Dates (yyyy-mm-dd): Converts to dd/mm/yyyy (SUNAT format)
 * - Date objects: Formats to dd/mm/yyyy
 * - Numbers: Formats with 2 decimal places (e.g., 1234.56)
 * - Strings: Escapes special characters for CSV (quotes, commas, newlines)
 *
 * CSV-specific escaping:
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles internal quotes (e.g., "Say ""Hello""" for: Say "Hello")
 *
 * @param value - Value to format (can be any type)
 * @param format - Export format ('csv' or 'txt')
 * @returns Formatted string ready for export
 *
 * @example
 * formatExportValue(null, 'csv')
 * // Returns: ''
 *
 * formatExportValue('2024-01-15', 'csv')
 * // Returns: '15/01/2024'
 *
 * formatExportValue(1234.5, 'csv')
 * // Returns: '1234.50'
 *
 * formatExportValue('Say "Hello"', 'csv')
 * // Returns: '"Say ""Hello"""'
 */
export function formatExportValue(value: unknown, format: 'csv' | 'txt', decimals: number = 2): string {
  // Handle null/undefined/empty
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Format dates as dd/mm/yyyy
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  // Format dates from Date objects
  if (value instanceof Date) {
    const day = value.getDate().toString().padStart(2, '0');
    const month = (value.getMonth() + 1).toString().padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Importes: 2 decimales (default). Tipo de Cambio: 3 (regex SIRE `\d\.\d{3}`).
  // SIRE espera negativos con formato "- #.##" (espacio entre signo y número).
  // PVSIRE rechaza "-123.45" sin espacio.
  if (typeof value === 'number') {
    if (value < 0) {
      return `- ${(-value).toFixed(decimals)}`;
    }
    return value.toFixed(decimals);
  }

  // Escape special characters for CSV if needed
  const stringValue = String(value);
  if (format === 'csv' && (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n'))) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generic mapping interface
 * Matches the FieldMapping interface from field-registry.ts
 */
export interface FieldMapping {
  sunatHeader: string;
  tsField?: string; // Field name in the TypeScript object
  defaultValue?: string;
  excludeFromExport?: boolean; // Flag to exclude column from exports
  /**
   * Si es true, emite valor vacío sin importar lo que tenga en BD.
   * Para posiciones SIRE que SUNAT completa automáticamente.
   */
  sireAutoFilled?: boolean;
  /** Decimales al exportar (default 2; usar 3 para Tipo de Cambio). */
  exportDecimals?: number;
}

/**
 * Exports invoice data to CSV format with proper field mapping
 *
 * This function generates a CSV file from an array of invoice objects, using the
 * provided field mappings to determine column order and headers. It handles all
 * data formatting through formatExportValue for consistency.
 *
 * Features:
 * - Maintains exact column order from mappings
 * - Handles missing fields gracefully (uses defaultValue if provided)
 * - Proper CSV escaping for special characters
 * - Header row included automatically
 * - Optimized for large datasets (up to 100k records)
 *
 * The resulting CSV is compatible with:
 * - Microsoft Excel
 * - Google Sheets
 * - SUNAT import systems
 * - Any standard CSV parser
 *
 * @param data - Array of invoice objects to export
 * @param mappings - Field mapping configuration (defines columns and order)
 * @returns CSV string with header row and data rows, or empty string if no data
 *
 * @example
 * const csv = exportToCSV(salesInvoices, SALES_CSV_MAPPING);
 * await saveFile('ventas_202401.csv', csv);
 *
 * // Result format:
 * // "FECHA DE EMISIÓN","SERIE","NÚMERO","TOTAL"
 * // "15/01/2024","F001","00001","118.00"
 * // "16/01/2024","F001","00002","236.00"
 */
export function exportToCSV<T>(data: T[], mappings: readonly FieldMapping[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Filter out columns marked as excludeFromExport
  const exportMappings = mappings.filter((m) => !m.excludeFromExport);

  // Build header row
  const headers = exportMappings.map((mapping) => formatExportValue(mapping.sunatHeader, 'csv'));

  // Build data rows
  const rows: string[] = [];

  // Add header
  rows.push(headers.join(','));

  // Add data
  data.forEach((item) => {
    const row: string[] = [];

    exportMappings.forEach((mapping) => {
      let value: unknown = '';

      if (mapping.sireAutoFilled) {
        value = '';
      } else if (mapping.tsField && mapping.tsField in (item as object)) {
        value = (item as Record<string, unknown>)[mapping.tsField];
      } else if (mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      row.push(formatExportValue(value, 'csv', mapping.exportDecimals));
    });

    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Exports invoice data to TXT format (pipe-delimited) for SUNAT
 *
 * This function generates a pipe-delimited TXT file compatible with SUNAT's import
 * format. It's identical to exportToCSV but uses pipe (|) as delimiter instead of
 * comma, and doesn't apply CSV-specific escaping.
 *
 * Features:
 * - Pipe-delimited format (SUNAT TXT standard)
 * - Maintains exact column order from mappings
 * - No special character escaping (simpler than CSV)
 * - Header row included
 * - Compatible with SUNAT import systems
 *
 * Use this format when:
 * - Importing back into SUNAT systems
 * - Sharing with accountants who use SUNAT tools
 * - Avoiding CSV parsing ambiguities
 *
 * @param data - Array of invoice objects to export
 * @param mappings - Field mapping configuration (defines columns and order)
 * @returns Pipe-delimited string with header and data, or empty string if no data
 *
 * @example
 * const txt = exportToTXT(purchaseInvoices, PURCHASES_CSV_MAPPING);
 * await saveFile('compras_202401.txt', txt);
 *
 * // Result format:
 * // FECHA DE EMISIÓN|SERIE|NÚMERO|TOTAL
 * // 15/01/2024|001|00001|118.00
 * // 16/01/2024|001|00002|236.00
 */
export function exportToTXT<T>(data: T[], mappings: readonly FieldMapping[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Filter out columns marked as excludeFromExport
  const exportMappings = mappings.filter((m) => !m.excludeFromExport);

  // SIRE no espera cabecera en el TXT — solo filas de datos separadas por |.
  // El CSV sí lleva cabecera (uso interno / Excel).
  const rows: string[] = [];

  // Add data
  data.forEach((item) => {
    const row: string[] = [];

    exportMappings.forEach((mapping) => {
      let value: unknown = '';

      if (mapping.sireAutoFilled) {
        value = '';
      } else if (mapping.tsField && mapping.tsField in (item as object)) {
        value = (item as Record<string, unknown>)[mapping.tsField];
      } else if (mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      row.push(formatExportValue(value, 'txt', mapping.exportDecimals));
    });

    rows.push(row.join('|'));
  });

  return rows.join('\n');
}

/**
 * Factory para crear funciones de export. Solo expone CSV/TXT —
 * cualquier otro formato (JSON, delimitador custom, batch) se agregará si
 * aparece un consumidor real, no como API especulativa.
 */
export function createExporter<T>(mappings: readonly FieldMapping[]) {
  return {
    toCSV: (data: T[]) => exportToCSV(data, mappings),
    toTXT: (data: T[]) => exportToTXT(data, mappings)
  };
}

// ============================================================================
// SALES & PURCHASES SPECIFIC EXPORTS
// Consolidated from csv-export.ts and txt-export.ts to eliminate unnecessary files
// ============================================================================

import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';
import { SALES_SUNAT_COLUMNS_MAPPING, PURCHASE_SUNAT_COLUMNS_MAPPING } from '@/shared/constants/field-registry';

/**
 * Export sales invoices to CSV format
 */
export function exportSalesCSV(invoices: SalesInvoice[]): string {
  const exporter = createExporter<SalesInvoice>(SALES_SUNAT_COLUMNS_MAPPING);
  return exporter.toCSV(invoices);
}

/**
 * Export purchases invoices to CSV format
 */
export function exportPurchasesCSV(invoices: PurchaseInvoice[]): string {
  const exporter = createExporter<PurchaseInvoice>(PURCHASE_SUNAT_COLUMNS_MAPPING);
  return exporter.toCSV(invoices);
}

/**
 * Export sales invoices to TXT format (SUNAT pipe-delimited)
 */
export function exportSalesTXT(invoices: SalesInvoice[]): string {
  const exporter = createExporter<SalesInvoice>(SALES_SUNAT_COLUMNS_MAPPING);
  return exporter.toTXT(invoices);
}

/**
 * Export purchases invoices to TXT format (SUNAT pipe-delimited)
 */
export function exportPurchasesTXT(invoices: PurchaseInvoice[]): string {
  const exporter = createExporter<PurchaseInvoice>(PURCHASE_SUNAT_COLUMNS_MAPPING);
  return exporter.toTXT(invoices);
}
