/**
 * Excel export functionality
 * TODO: Implement Excel export functionality with proper XLSX library
 */

import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';

/**
 * Export sales invoices to Excel format
 * @param invoices - Sales invoices to export
 * @returns ArrayBuffer with Excel file content
 * @throws Error indicating Excel export is not implemented
 */
export function exportSalesExcel(_invoices: SalesInvoice[]): ArrayBuffer {
  throw new Error('Excel export is not yet implemented. Please use CSV or TXT format.');
}

/**
 * Export purchase invoices to Excel format
 * @param invoices - Purchase invoices to export
 * @returns ArrayBuffer with Excel file content
 * @throws Error indicating Excel export is not implemented
 */
export function exportPurchasesExcel(_invoices: PurchaseInvoice[]): ArrayBuffer {
  throw new Error('Excel export is not yet implemented. Please use CSV or TXT format.');
}
