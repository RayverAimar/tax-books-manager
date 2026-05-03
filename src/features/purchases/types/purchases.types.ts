import type { SunatPurchaseFields, CalculatedFields } from '@/shared/types/sunat.types';
import type { SystemFields } from '@/shared/types/common.types';

/**
 * SUNAT Purchase Invoice - Purchase Registry
 * Based on the official 80-column SUNAT CSV format
 *
 * Composition:
 * - SystemFields: System-managed fields (id, createdAt, updatedAt)
 * - SunatPurchaseFields: Official 80 SUNAT columns
 * - CalculatedFields: Computed fields (vatPercentage)
 */
export interface PurchaseInvoice extends SystemFields, SunatPurchaseFields, CalculatedFields {}
