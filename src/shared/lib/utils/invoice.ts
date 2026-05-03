/**
 * Invoice utility functions
 */

/**
 * Counter for generating temporary negative IDs for new invoices
 * These will be replaced with actual SQLite AUTOINCREMENT IDs upon save
 */
let tempIdCounter = -1;

/**
 * Generate temporary ID for new invoices not yet saved to database
 * Uses negative numbers to avoid conflicts with SQLite AUTOINCREMENT (which uses positive)
 *
 * @returns Temporary negative number ID (e.g., -1, -2, -3, ...)
 * @example
 * const id = generateInvoiceId(); // -1
 * const id2 = generateInvoiceId(); // -2
 */
export function generateInvoiceId(): number {
  return tempIdCounter--;
}
