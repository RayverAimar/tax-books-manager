/**
 * Currency formatting utilities for Peruvian Nuevo Sol (PEN)
 */

/**
 * Format amount as Peruvian currency (PEN)
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "S/ 1,234.56")
 * @example
 * formatCurrency(1234.56) // "S/ 1,234.56"
 * formatCurrency(0) // "S/ 0.00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN'
  }).format(amount);
}
