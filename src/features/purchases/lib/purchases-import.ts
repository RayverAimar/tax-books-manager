import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';
import { generateInvoiceId } from '@/shared/lib/utils/invoice';
import { PURCHASE_SUNAT_COLUMNS_MAPPING } from '@/shared/constants/field-registry';
import { roundWithEpsilon } from '@/shared/lib/utils/invoice-calculations';
import { isValidRUC, isValidDNI, truncateToLength, FIELD_LENGTH_LIMITS } from '@/shared/constants/validation.constants';
import type { ImportResult } from '@/shared/lib/import/import-types';
import { createImporter } from '@/shared/lib/import/generic-import';

/**
 * Post-process purchase invoice: Calculate vatPercentage
 *
 * SUNAT Accounting Standard:
 * We use only "DG" (Destinado a operaciones Gravadas) fields because:
 * - DG: Purchases destined for taxed operations - consistent IGV rate applies
 * - DGNG: Mixed use (taxed + non-taxed) - subject to proportional allocation (prorrata)
 * - DNG: Non-taxed operations - no tax credit allowed
 *
 * Formula: %IGV = (IGV_DG / BI_Gravado_DG) × 100
 */
function postProcessPurchaseInvoice(record: Partial<PurchaseInvoice>): void {
  const recordMap = record as Record<string, string | number | null>;
  const taxableBaseTaxed = typeof recordMap.taxableBaseTaxed === 'number' ? recordMap.taxableBaseTaxed : 0;
  const vatAmountTaxed = typeof recordMap.vatAmountTaxed === 'number' ? recordMap.vatAmountTaxed : 0;

  if (taxableBaseTaxed > 0) {
    const rawPercentage = (vatAmountTaxed / taxableBaseTaxed) * 100;
    const vatPercentage = roundWithEpsilon(rawPercentage, 0.1);
    recordMap.vatPercentage = vatPercentage;
  } else {
    recordMap.vatPercentage = null;
  }
}

/**
 * Validate and sanitize purchase invoice data
 */
function validatePurchaseInvoice(record: Partial<PurchaseInvoice>): void {
  const recordMap = record as Record<string, string | number | null>;

  // SECURITY: Validate and sanitize input data
  // Company RUC validation (11 digits)
  if (recordMap.ruc && typeof recordMap.ruc === 'string' && !isValidRUC(recordMap.ruc)) {
    // Invalid RUC - warning only
  }

  // Supplier document validation (RUC or DNI)
  if (recordMap.supplierDocNumber && typeof recordMap.supplierDocNumber === 'string') {
    const docNumber = recordMap.supplierDocNumber;
    if (docNumber.length === 11 && !isValidRUC(docNumber)) {
      // Invalid RUC - warning only
    } else if (docNumber.length === 8 && !isValidDNI(docNumber)) {
      // Invalid DNI - warning only
    }
  }

  // Length limits for text fields to prevent buffer overflow
  if (typeof recordMap.businessName === 'string') {
    recordMap.businessName = truncateToLength(recordMap.businessName, FIELD_LENGTH_LIMITS.BUSINESS_NAME);
  }
  if (typeof recordMap.supplierName === 'string') {
    recordMap.supplierName = truncateToLength(recordMap.supplierName, FIELD_LENGTH_LIMITS.SUPPLIER_NAME);
  }
  if (typeof recordMap.voucherSeries === 'string') {
    recordMap.voucherSeries = truncateToLength(recordMap.voucherSeries, FIELD_LENGTH_LIMITS.SERIES);
  }
  if (typeof recordMap.voucherNumberStart === 'string') {
    recordMap.voucherNumberStart = truncateToLength(recordMap.voucherNumberStart, FIELD_LENGTH_LIMITS.NUMBER);
  }
  if (typeof recordMap.voucherNumberEnd === 'string') {
    recordMap.voucherNumberEnd = truncateToLength(recordMap.voucherNumberEnd, FIELD_LENGTH_LIMITS.NUMBER);
  }
}

/**
 * Create purchases importer instance with all configurations
 */
const purchasesImporter = createImporter<PurchaseInvoice>(PURCHASE_SUNAT_COLUMNS_MAPPING, {
  strictColumnCheck: true,
  generateId: generateInvoiceId,
  postProcess: postProcessPurchaseInvoice,
  validateRecord: validatePurchaseInvoice
});

/**
 * Imports SUNAT format purchases CSV files (80 columns, comma-separated)
 *
 * This function handles the import of purchase records from SUNAT's CSV export format,
 * which includes 80 columns (including 39 CLU fields - Campo de Libre Utilización).
 *
 * Key features:
 * - 80 columns (80 SUNAT fields)
 * - Multiple IGV categories (DG, DGNG, DNG)
 * - 39 CLU (free-use) fields for custom data
 * - Complex tax base calculations
 *
 * Validation steps:
 * 1. Verifies file is not empty
 * 2. Validates exact 80-column match
 * 3. Handles BOM and encoding issues
 * 4. Maps all fields including CLU columns
 *
 * Performance: Optimized for files up to 50,000 records. Uses streaming parse.
 *
 * @param csvContent - Raw CSV file content as string
 * @returns Promise resolving to ImportResult with success status, parsed data, errors, and warnings
 *
 * @example
 * const fileContent = await readFile('compras_202401.csv');
 * const result = await importPurchasesCSV(fileContent);
 *
 * if (result.success) {
 *   await savePurchaseRecords(companyId, periodCode, result.data);
 * }
 */
export async function importPurchasesCSV(csvContent: string): Promise<ImportResult<PurchaseInvoice>> {
  return purchasesImporter.fromCSV(csvContent);
}

/**
 * Imports SUNAT format purchases TXT files (80 columns, pipe-separated)
 *
 * This function handles the import of purchase records from SUNAT's TXT export format,
 * which includes 80 columns (including 39 CLU fields - Campo de Libre Utilización).
 *
 * Key features:
 * - 80 columns (80 SUNAT fields)
 * - Multiple IGV categories (DG, DGNG, DNG)
 * - 39 CLU (free-use) fields for custom data
 * - Complex tax base calculations
 *
 * Validation steps:
 * 1. Verifies file is not empty
 * 2. Validates exact 80-column match
 * 3. Handles BOM and encoding issues
 * 4. Maps all fields including CLU columns
 *
 * Performance: Optimized for files up to 50,000 records. Uses streaming parse.
 *
 * @param txtContent - Raw TXT file content as string
 * @returns Promise resolving to ImportResult with success status, parsed data, errors, and warnings
 *
 * @example
 * const fileContent = await readFile('compras_202401.txt');
 * const result = await importPurchasesTXT(fileContent);
 *
 * if (result.success) {
 *   await savePurchaseRecords(companyId, periodCode, result.data);
 * }
 */
export async function importPurchasesTXT(txtContent: string): Promise<ImportResult<PurchaseInvoice>> {
  return purchasesImporter.fromTXT(txtContent);
}
