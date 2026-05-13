/**
 * Invoice utility functions
 */

/**
 * Counter for generating temporary negative IDs for new invoices.
 * Reset on company/period change so the counter doesn't drift forever.
 */
let tempIdCounter = -1;

/**
 * Generate temporary ID for new invoices not yet saved to database.
 * Negative numbers avoid collisions with SQLite AUTOINCREMENT positives.
 */
export function generateInvoiceId(): number {
  return tempIdCounter--;
}

/**
 * Reset the temporary id counter. Call when the user switches company or
 * period — the previous unsaved IDs are no longer reachable, so we can
 * start at -1 again.
 */
export function resetInvoiceIdCounter(): void {
  tempIdCounter = -1;
}
