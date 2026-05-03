/**
 * Transform utilities for sales invoice data
 */

import type { CreateInvoiceData } from '@/shared/types/invoice.types';
import type { SunatSalesFields, CalculatedFields } from '@/shared/types/sunat.types';
import { SALES_SUNAT_COLUMNS_MAPPING } from '@/shared/constants/field-registry';

/**
 * Form data - Same fields as SunatSalesFields & CalculatedFields but all as strings (HTML inputs)
 */
export type SalesInvoiceFormData = {
  [K in keyof (SunatSalesFields & CalculatedFields)]: string | undefined;
};

/**
 * Convert string to number, preserving null/undefined/empty
 */
function convertToNumber(value: string | undefined | null): number | null {
  if (!value || value.trim() === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Transform form data (strings) to CreateInvoiceData (proper types)
 * Uses SALES_SUNAT_COLUMNS_MAPPING to identify float fields
 */
export function transformSalesFormData(
  data: Partial<SalesInvoiceFormData>
): CreateInvoiceData<'sales'> {
  // Get numeric field names from mapping (single source of truth)
  const numericFields = new Set(
    SALES_SUNAT_COLUMNS_MAPPING
      .filter(m => m.dataType === 'float')
      .map(m => m.tsField)
  );

  const result: Record<string, unknown> = {};

  // Convert each field
  for (const [key, value] of Object.entries(data)) {
    const fieldName = key as keyof (SunatSalesFields & CalculatedFields);
    if (numericFields.has(fieldName)) {
      result[fieldName] = convertToNumber(value);
    } else {
      result[fieldName] = (!value || value.trim() === '') ? null : value;
    }
  }

  // Add null for missing SUNAT fields
  for (const mapping of SALES_SUNAT_COLUMNS_MAPPING) {
    if (!(mapping.tsField in result)) {
      result[mapping.tsField] = null;
    }
  }

  return result as CreateInvoiceData<'sales'>;
}
