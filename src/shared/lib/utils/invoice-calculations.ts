/**
 * Centralized invoice field calculations
 * DRY principle: Single source of truth for all invoice calculations
 *
 * SUNAT Tax Calculation Standards:
 * ================================
 *
 * Base Formula:
 * Total = BI (Base Imponible) × (1 + %IGV/100)
 * Therefore: BI = Total / (1 + %IGV/100)
 * And: IGV = Total - BI
 *
 * Note: %IGV is calculated with 2 decimal precision (e.g., 18.00, 10.50)
 *
 * For Sales Invoices:
 * - Work with: BI Gravada (Taxable Base) and IGV/IPM
 * - Direct calculation: Total Amount = Taxable Base + VAT Amount
 *
 * For Purchase Invoices:
 * - Work with: BI Gravado DG and IGV/IPM DG
 * - DG = Destinado a operaciones Gravadas (Destined for Taxed Operations)
 * - Must subtract non-taxed amount: Gravable Amount = Total Amount - Non-Taxable Value
 * - Then: Gravable Amount = Taxable Base Taxed + VAT Amount Taxed
 *
 * Tax Categories (Purchases only):
 * - DG: Purchases for taxed operations (full tax credit)
 * - DGNG: Mixed use - taxed + non-taxed (proportional allocation applies)
 * - DNG: Non-taxed operations (no tax credit)
 *
 * We use only DG fields for calculations to maintain consistent IGV rates.
 */

import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';

/**
 * Round a number to the nearest integer if it's very close (within epsilon)
 * Used for IGV percentages that should be whole numbers but have floating point errors
 *
 * @param value - The number to round
 * @param epsilon - The absolute tolerance for rounding (default: 0.1)
 * @returns The rounded value if within epsilon, otherwise the original value rounded to 2 decimals
 *
 * @example
 * roundWithEpsilon(17.98) // Returns 18 (diff = 0.02, within 0.1)
 * roundWithEpsilon(18.05) // Returns 18 (diff = 0.05, within 0.1)
 * roundWithEpsilon(18.50) // Returns 18.50 (diff = 0.50, exceeds 0.1)
 * roundWithEpsilon(11.92) // Returns 12 (diff = 0.08, within 0.1)
 */
export function roundWithEpsilon(value: number, epsilon: number = 0.1): number {
  const rounded = Math.round(value);
  const diff = Math.abs(value - rounded);

  // If the difference is within the epsilon tolerance, round to nearest integer
  if (diff <= epsilon) {
    return rounded;
  }

  // Otherwise, return the value rounded to 2 decimals
  return Math.round(value * 100) / 100;
}

/**
 * Calculate related fields when editing a sales invoice
 *
 * @param invoice - The current invoice data
 * @param columnId - The field being edited
 * @param newValue - The new value for the field
 * @returns Object with all fields that need to be updated
 */
export function calculateSalesRelatedFields(
  invoice: SalesInvoice,
  columnId: string,
  newValue: unknown
): Partial<SalesInvoice> {
  const updates: Partial<SalesInvoice> = {
    [columnId]: newValue
  } as Partial<SalesInvoice>;

  // IGV% changed - recalculate Taxable Base and VAT Amount
  if (columnId === 'vatPercentage') {
    const vatPercentage = typeof newValue === 'number' ? newValue : parseInt(String(newValue), 10);
    const totalAmount = invoice.totalAmount || 0;

    if (!isNaN(vatPercentage) && vatPercentage >= 0 && vatPercentage <= 100 && totalAmount > 0) {
      // Formula: Total Amount = Taxable Base * (1 + %IGV/100)
      // Therefore: Taxable Base = Total Amount / (1 + %IGV/100)
      const taxableBase = totalAmount / (1 + vatPercentage / 100);
      const vatAmount = totalAmount - taxableBase;

      updates.vatPercentage = vatPercentage;
      updates.taxableBase = Number(taxableBase.toFixed(2));
      updates.vatAmount = Number(vatAmount.toFixed(2));
    }
  }

  // Total Amount changed - recalculate Taxable Base and VAT Amount
  if (columnId === 'totalAmount') {
    const totalAmount = typeof newValue === 'number' ? newValue : parseFloat(String(newValue));
    const vatPercentage = invoice.vatPercentage || 0;

    if (!isNaN(totalAmount) && totalAmount >= 0 && vatPercentage > 0) {
      const taxableBase = totalAmount / (1 + vatPercentage / 100);
      const vatAmount = totalAmount - taxableBase;

      updates.totalAmount = Number(totalAmount.toFixed(2));
      updates.taxableBase = Number(taxableBase.toFixed(2));
      updates.vatAmount = Number(vatAmount.toFixed(2));
    }
  }

  return updates;
}

/**
 * Calculate related fields when editing a purchase invoice
 *
 * @param invoice - The current invoice data
 * @param columnId - The field being edited
 * @param newValue - The new value for the field
 * @returns Object with all fields that need to be updated
 */
export function calculatePurchaseRelatedFields(
  invoice: PurchaseInvoice,
  columnId: string,
  newValue: unknown
): Partial<PurchaseInvoice> {
  const updates: Partial<PurchaseInvoice> = {
    [columnId]: newValue
  } as Partial<PurchaseInvoice>;

  // IGV% changed - recalculate all BI and IGV fields proportionally
  if (columnId === 'vatPercentage') {
    const vatPercentage = typeof newValue === 'number' ? newValue : parseInt(String(newValue), 10);
    const totalAmount = invoice.totalAmount || 0;

    if (!isNaN(vatPercentage) && vatPercentage >= 0 && vatPercentage <= 100 && totalAmount > 0) {
      // Get current BI distribution to maintain proportions
      const biDg = invoice.taxableBaseTaxed || 0;
      const biDgng = invoice.taxableBaseMixed || 0;
      const biDng = invoice.taxableBaseUntaxed || 0;
      const totalCurrentBi = biDg + biDgng + biDng;

      // Calculate new totals
      const newTotalTaxableBase = totalAmount / (1 + vatPercentage / 100);
      const newTotalVat = totalAmount - newTotalTaxableBase;

      updates.vatPercentage = vatPercentage;

      // Distribute new BI and IGV proportionally
      if (totalCurrentBi > 0) {
        const factorBi = newTotalTaxableBase / totalCurrentBi;
        const factorVat = newTotalVat / newTotalTaxableBase; // IGV rate

        if (biDg > 0) {
          const newBiDg = biDg * factorBi;
          updates.taxableBaseTaxed = Number(newBiDg.toFixed(2));
          updates.vatAmountTaxed = Number((newBiDg * factorVat).toFixed(2));
        }
        if (biDgng > 0) {
          const newBiDgng = biDgng * factorBi;
          updates.taxableBaseMixed = Number(newBiDgng.toFixed(2));
          updates.vatAmountMixed = Number((newBiDgng * factorVat).toFixed(2));
        }
        if (biDng > 0) {
          const newBiDng = biDng * factorBi;
          updates.taxableBaseUntaxed = Number(newBiDng.toFixed(2));
          updates.vatAmountUntaxed = Number((newBiDng * factorVat).toFixed(2));
        }
      }
    }
  }

  // Total Amount changed - recalculate Taxable Base Taxed and VAT Amount Taxed
  if (columnId === 'totalAmount') {
    const totalAmount = typeof newValue === 'number' ? newValue : parseFloat(String(newValue));
    const vatPercentage = invoice.vatPercentage || 0;
    const nonTaxableValue = invoice.nonTaxableValue || 0;

    if (!isNaN(totalAmount) && totalAmount >= 0 && vatPercentage > 0) {
      updates.totalAmount = Number(totalAmount.toFixed(2));

      // Calculate: Total Amount - Non-Taxable Value
      const gravableAmount = totalAmount - nonTaxableValue;

      // Only calculate if gravableAmount is not 0
      if (gravableAmount !== 0) {
        // Formula: gravableAmount = Taxable Base Taxed + VAT Amount Taxed
        // Formula: gravableAmount = Taxable Base Taxed * (1 + %IGV/100)
        // Therefore: Taxable Base Taxed = gravableAmount / (1 + %IGV/100)
        const taxableBaseTaxed = gravableAmount / (1 + vatPercentage / 100);
        const vatAmountTaxed = gravableAmount - taxableBaseTaxed;

        updates.taxableBaseTaxed = Number(taxableBaseTaxed.toFixed(2));
        updates.vatAmountTaxed = Number(vatAmountTaxed.toFixed(2));
      }
    }
  }

  return updates;
}

/**
 * Calculate IGV breakdown by rate for sales invoices
 * Groups invoices by their calculated IGV rate and sums the IGV amounts
 *
 * @param invoices - Array of sales invoices
 * @returns Array of {rate, amount} objects sorted by rate descending
 *
 * @example
 * const breakdown = calculateSalesVatBreakdown(salesInvoices);
 * // Returns: [
 * //   { rate: 18, amount: 1500.50 },
 * //   { rate: 10, amount: 250.00 },
 * //   { rate: 0, amount: 100.00 }
 * // ]
 */
export function calculateSalesVatBreakdown(invoices: SalesInvoice[]): Array<{ rate: number; amount: number }> {
  // Map to store: rate => total IGV amount
  const rateMap = new Map<number, number>();

  for (const invoice of invoices) {
    const taxableBase = invoice.taxableBase || 0;
    const vatAmount = invoice.vatAmount || 0;

    // Skip invoices with no IGV
    if (vatAmount === 0) continue;

    // Calculate rate: IGV / BI * 100
    // Use roundWithEpsilon to round to nearest integer if close (e.g., 17.98 -> 18)
    // Note: Works with negative values too (e.g., -26.95 / -149.69 = 18%)
    let rate = 0;
    if (taxableBase !== 0) {
      const calculatedRate = (vatAmount / taxableBase) * 100;
      rate = roundWithEpsilon(calculatedRate);
    } else if (invoice.vatPercentage !== null && invoice.vatPercentage !== undefined) {
      rate = invoice.vatPercentage;
    }

    // Group by rate
    const currentAmount = rateMap.get(rate) || 0;
    rateMap.set(rate, currentAmount + vatAmount);
  }

  // Convert map to array and sort by rate descending
  return Array.from(rateMap.entries())
    .map(([rate, amount]) => ({
      rate,
      amount: Number(amount.toFixed(2))
    }))
    .sort((a, b) => b.rate - a.rate);
}

/**
 * Calculate IGV breakdown by rate for purchase invoices
 * Groups invoices by their calculated IGV rate and sums the IGV amounts
 * Considers all three IGV categories: DG, DGNG, and DNG
 *
 * @param invoices - Array of purchase invoices
 * @returns Array of {rate, amount} objects sorted by rate descending
 *
 * @example
 * const breakdown = calculatePurchasesVatBreakdown(purchaseInvoices);
 * // Returns: [
 * //   { rate: 18, amount: 2500.75 },
 * //   { rate: 10, amount: 450.25 }
 * // ]
 */
export function calculatePurchasesVatBreakdown(invoices: PurchaseInvoice[]): Array<{ rate: number; amount: number }> {
  // Map to store: rate => total IGV amount
  const rateMap = new Map<number, number>();

  for (const invoice of invoices) {
    const biDg = invoice.taxableBaseTaxed || 0;
    const biDgng = invoice.taxableBaseMixed || 0;
    const biDng = invoice.taxableBaseUntaxed || 0;
    const vatDg = invoice.vatAmountTaxed || 0;
    const vatDgng = invoice.vatAmountMixed || 0;
    const vatDng = invoice.vatAmountUntaxed || 0;

    const totalBi = biDg + biDgng + biDng;
    const totalVat = vatDg + vatDgng + vatDng;

    // Skip invoices with no IGV
    if (totalVat === 0) continue;

    // Calculate rate: IGV / BI * 100
    // Use roundWithEpsilon to round to nearest integer if close (e.g., 17.98 -> 18)
    // Note: Works with negative values too (e.g., -26.95 / -149.69 = 18%)
    let rate = 0;
    if (totalBi !== 0) {
      const calculatedRate = (totalVat / totalBi) * 100;
      rate = roundWithEpsilon(calculatedRate);
    } else if (invoice.vatPercentage !== null && invoice.vatPercentage !== undefined) {
      rate = invoice.vatPercentage;
    }

    // Group by rate
    const currentAmount = rateMap.get(rate) || 0;
    rateMap.set(rate, currentAmount + totalVat);
  }

  // Convert map to array and sort by rate descending
  return Array.from(rateMap.entries())
    .map(([rate, amount]) => ({
      rate,
      amount: Number(amount.toFixed(2))
    }))
    .sort((a, b) => b.rate - a.rate);
}
