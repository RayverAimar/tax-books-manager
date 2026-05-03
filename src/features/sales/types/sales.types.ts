import type { SunatSalesFields, CalculatedFields } from '@/shared/types/sunat.types';
import type { SystemFields } from '@/shared/types/common.types';

/**
 * SUNAT Sales Invoice - Sales and Income Registry
 * Based on the official 40-column SUNAT CSV format
 *
 * Composition:
 * - SystemFields: System-managed fields (id, createdAt, updatedAt)
 * - SunatSalesFields: Official 40 SUNAT columns
 * - CalculatedFields: Computed fields (vatPercentage)
 */
export interface SalesInvoice extends SystemFields, SunatSalesFields, CalculatedFields {}
