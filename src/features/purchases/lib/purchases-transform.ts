/**
 * Transform utilities for purchase invoice data
 */

import type { CreateInvoiceData } from '@/shared/types/invoice.types';
import type { SunatPurchaseFields, CalculatedFields } from '@/shared/types/sunat.types';
import { PURCHASE_SUNAT_COLUMNS_MAPPING } from '@/shared/constants/field-registry';

/**
 * Form data - Same fields as SunatPurchaseFields & CalculatedFields but all as strings (HTML inputs)
 */
export type PurchaseInvoiceFormData = {
  [K in keyof (SunatPurchaseFields & CalculatedFields)]: string | undefined;
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
 * Uses PURCHASE_SUNAT_COLUMNS_MAPPING to identify float fields
 */
export function transformPurchaseFormData(
  data: Partial<PurchaseInvoiceFormData>
): CreateInvoiceData<'purchases'> {
  // Get numeric field names from mapping (single source of truth)
  const numericFields = new Set(
    PURCHASE_SUNAT_COLUMNS_MAPPING
      .filter(m => m.dataType === 'float')
      .map(m => m.tsField)
  );

  const result: Record<string, unknown> = {};

  // Convert each field
  for (const [key, value] of Object.entries(data)) {
    const fieldName = key as keyof (SunatPurchaseFields & CalculatedFields);
    if (numericFields.has(fieldName)) {
      result[fieldName] = convertToNumber(value);
    } else {
      result[fieldName] = (!value || value.trim() === '') ? null : value;
    }
  }

  // Add null for missing SUNAT fields
  for (const mapping of PURCHASE_SUNAT_COLUMNS_MAPPING) {
    if (!(mapping.tsField in result)) {
      result[mapping.tsField] = null;
    }
  }

  return result as CreateInvoiceData<'purchases'>;
}
