/**
 * CSV/TXT builders aligned to the SUNAT field registry.
 *
 * Build deterministic CSV text suitable for `importSalesCSV` / `importPurchasesCSV`.
 */

import { SALES_SUNAT_COLUMNS_MAPPING, PURCHASE_SUNAT_COLUMNS_MAPPING } from '@/shared/constants/field-registry';
import type { SupportedDataType } from '@/shared/types/common.types';

interface FieldMapping {
  sunatHeader: string;
  tsField: string;
  dataType: SupportedDataType;
}

/**
 * Default value per data type when no override is provided.
 * Keep these neutral so that imports succeed without spurious validation noise.
 */
function defaultFor(dataType: SupportedDataType): string {
  if (dataType === 'integer' || dataType === 'float') return '0';
  if (dataType === 'date') return '01/01/2024';
  return '';
}

/**
 * Translates a `tsField` -> value map into a CSV row string for the given mapping.
 * Unspecified columns get type-based defaults.
 */
function buildRow(mapping: readonly FieldMapping[], values: Record<string, string | number>): string {
  return mapping
    .map((m) => {
      const byTsField = values[m.tsField];
      const byHeader = values[m.sunatHeader];
      const v = byTsField !== undefined ? byTsField : byHeader !== undefined ? byHeader : defaultFor(m.dataType);
      return String(v);
    })
    .join(',');
}

function header(mapping: readonly FieldMapping[], delimiter = ','): string {
  return mapping.map((m) => m.sunatHeader).join(delimiter);
}

/**
 * Build a SUNAT-shaped sales CSV with the given rows.
 *
 * @example
 * const csv = buildSalesCsv([{ ruc: '12345678901', taxableBase: 100, vatAmount: 18 }]);
 */
export function buildSalesCsv(rows: Array<Record<string, string | number>>): string {
  return [header(SALES_SUNAT_COLUMNS_MAPPING), ...rows.map((r) => buildRow(SALES_SUNAT_COLUMNS_MAPPING, r))].join('\n');
}

/**
 * Build a SUNAT-shaped purchases CSV with the given rows.
 */
export function buildPurchasesCsv(rows: Array<Record<string, string | number>>): string {
  return [header(PURCHASE_SUNAT_COLUMNS_MAPPING), ...rows.map((r) => buildRow(PURCHASE_SUNAT_COLUMNS_MAPPING, r))].join(
    '\n'
  );
}

/**
 * Build a pipe-delimited TXT body (SUNAT TXT format) for sales.
 * Note: SUNAT TXT typically omits the header row, but parsers in this project
 * accept it. Tests should mirror the importer they target.
 */
export function buildSalesTxt(rows: Array<Record<string, string | number>>, withHeader = false): string {
  const body = rows.map((r) => buildRow(SALES_SUNAT_COLUMNS_MAPPING, r).replace(/,/g, '|'));
  if (withHeader) {
    return [header(SALES_SUNAT_COLUMNS_MAPPING, '|'), ...body].join('\n');
  }
  return body.join('\n');
}

export function buildPurchasesTxt(rows: Array<Record<string, string | number>>, withHeader = false): string {
  const body = rows.map((r) => buildRow(PURCHASE_SUNAT_COLUMNS_MAPPING, r).replace(/,/g, '|'));
  if (withHeader) {
    return [header(PURCHASE_SUNAT_COLUMNS_MAPPING, '|'), ...body].join('\n');
  }
  return body.join('\n');
}

/**
 * Returns the SUNAT header for a given `tsField` in sales mapping.
 * Useful when a test needs to set a value by its CSV header name.
 */
export function salesHeaderFor(tsField: string): string {
  return SALES_SUNAT_COLUMNS_MAPPING.find((m) => m.tsField === tsField)!.sunatHeader;
}

export function purchasesHeaderFor(tsField: string): string {
  return PURCHASE_SUNAT_COLUMNS_MAPPING.find((m) => m.tsField === tsField)!.sunatHeader;
}
