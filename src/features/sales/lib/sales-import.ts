import type { SalesInvoice } from '@/features/sales/types/sales.types';
import { generateInvoiceId } from '@/shared/lib/utils/invoice';
import { SALES_SUNAT_COLUMNS_MAPPING } from '@/shared/constants/field-registry';
import { roundWithEpsilon } from '@/shared/lib/utils/invoice-calculations';
import { isValidRUC, isValidDNI, truncateToLength, FIELD_LENGTH_LIMITS } from '@/shared/constants/validation.constants';
import type { ImportResult } from '@/shared/lib/import/import-types';
import { createImporter } from '@/shared/lib/import/generic-import';

/**
 * Post-process sales invoice: Calculate vatPercentage
 */
function postProcessSalesInvoice(record: Partial<SalesInvoice>): void {
  const recordMap = record as Record<string, string | number | null>;
  const taxableBase = typeof recordMap.taxableBase === 'number' ? recordMap.taxableBase : 0;
  const vatAmount = typeof recordMap.vatAmount === 'number' ? recordMap.vatAmount : 0;

  if (taxableBase > 0) {
    const rawPercentage = (vatAmount / taxableBase) * 100;
    const vatPercentage = roundWithEpsilon(rawPercentage, 0.1);
    recordMap.vatPercentage = vatPercentage;
  } else {
    recordMap.vatPercentage = null;
  }
}

/**
 * Validate and sanitize sales invoice data
 */
function validateSalesInvoice(record: Partial<SalesInvoice>, rowNumber: number): string[] {
  const recordMap = record as Record<string, string | number | null>;
  const warnings: string[] = [];

  // RUC validation (11 digits)
  if (recordMap.ruc && typeof recordMap.ruc === 'string' && !isValidRUC(recordMap.ruc)) {
    warnings.push(`Fila ${rowNumber}: RUC inválido "${recordMap.ruc}" (deben ser 11 dígitos)`);
  }

  // Customer document validation (RUC or DNI)
  if (recordMap.customerDocNumber && typeof recordMap.customerDocNumber === 'string') {
    const docNumber = recordMap.customerDocNumber;
    if (docNumber.length === 11 && !isValidRUC(docNumber)) {
      warnings.push(`Fila ${rowNumber}: RUC de cliente inválido "${docNumber}"`);
    } else if (docNumber.length === 8 && !isValidDNI(docNumber)) {
      warnings.push(`Fila ${rowNumber}: DNI de cliente inválido "${docNumber}"`);
    }
  }

  // Length limits for text fields to prevent buffer overflow
  if (typeof recordMap.businessName === 'string') {
    recordMap.businessName = truncateToLength(recordMap.businessName, FIELD_LENGTH_LIMITS.BUSINESS_NAME);
  }
  if (typeof recordMap.customerName === 'string') {
    recordMap.customerName = truncateToLength(recordMap.customerName, FIELD_LENGTH_LIMITS.CUSTOMER_NAME);
  }
  if (typeof recordMap.voucherSeries === 'string') {
    recordMap.voucherSeries = truncateToLength(recordMap.voucherSeries, FIELD_LENGTH_LIMITS.SERIES);
  }
  if (typeof recordMap.voucherNumber === 'string') {
    recordMap.voucherNumber = truncateToLength(recordMap.voucherNumber, FIELD_LENGTH_LIMITS.NUMBER);
  }

  return warnings;
}

/**
 * Create sales importer instance with all configurations
 */
const salesImporter = createImporter<SalesInvoice>(SALES_SUNAT_COLUMNS_MAPPING, {
  strictColumnCheck: true,
  generateId: generateInvoiceId,
  postProcess: postProcessSalesInvoice,
  validateRecord: validateSalesInvoice
});

/**
 * Imports SUNAT format sales CSV files (40 columns, comma-separated)
 *
 * This function handles the import of sales records from SUNAT's CSV export format.
 * It performs comprehensive validation of file structure, column headers, and data integrity.
 *
 * Validation steps:
 * 1. Verifies file is not empty
 * 2. Validates exact column match against SUNAT specification (40 columns)
 * 3. Handles BOM (Byte Order Mark) in UTF-8 files
 * 4. Maps each row to SalesInvoice type with appropriate data transformations
 *
 * Data transformations applied:
 * - Dates: Converts dd/mm/yyyy to yyyy-mm-dd format
 * - Numbers: Parses decimal values, defaults to 0 for invalid numbers
 * - Empty values: Preserved as null (important for SUNAT compliance)
 *
 * @param csvContent - Raw CSV file content as string
 * @returns Promise resolving to ImportResult with success status, parsed data, errors, and warnings
 *
 * @example
 * const fileContent = await readFile('ventas_202401.csv');
 * const result = await importSalesCSV(fileContent);
 *
 * if (result.success) {
 *   await saveSalesRecords(companyId, periodCode, result.data);
 * }
 */
export async function importSalesCSV(csvContent: string): Promise<ImportResult<SalesInvoice>> {
  return salesImporter.fromCSV(csvContent);
}

/**
 * Imports SUNAT format sales TXT files (40 columns, pipe-separated)
 *
 * This function handles the import of sales records from SUNAT's TXT export format.
 * It performs comprehensive validation of file structure, column headers, and data integrity.
 *
 * Validation steps:
 * 1. Verifies file is not empty
 * 2. Validates exact column match against SUNAT specification (40 columns)
 * 3. Handles BOM (Byte Order Mark) in UTF-8 files
 * 4. Maps each row to SalesInvoice type with appropriate data transformations
 *
 * Data transformations applied:
 * - Dates: Converts dd/mm/yyyy to yyyy-mm-dd format
 * - Numbers: Parses decimal values, defaults to 0 for invalid numbers
 * - Empty values: Preserved as null (important for SUNAT compliance)
 *
 * @param txtContent - Raw TXT file content as string
 * @returns Promise resolving to ImportResult with success status, parsed data, errors, and warnings
 *
 * @example
 * const fileContent = await readFile('ventas_202401.txt');
 * const result = await importSalesTXT(fileContent);
 *
 * if (result.success) {
 *   await saveSalesRecords(companyId, periodCode, result.data);
 * }
 */
export async function importSalesTXT(txtContent: string): Promise<ImportResult<SalesInvoice>> {
  return salesImporter.fromTXT(txtContent);
}
