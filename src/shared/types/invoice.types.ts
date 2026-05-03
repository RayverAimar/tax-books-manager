/**
 * Invoice types enum for better type safety
 */
export enum InvoiceTypeEnum {
  SALES = 'sales',
  PURCHASES = 'purchases'
}

/**
 * Union type for invoice types (for backwards compatibility)
 */
export type InvoiceType = 'sales' | 'purchases';

/**
 * Type mapping for invoice types
 * Import SalesInvoice and PurchaseInvoice from their respective feature modules
 */
export type InvoiceMap<T extends InvoiceType> =
  T extends 'sales' ? import('@/features/sales/types/sales.types').SalesInvoice :
  T extends 'purchases' ? import('@/features/purchases/types/purchases.types').PurchaseInvoice :
  never;

/**
 * Represents data needed to create a new invoice (without auto-generated fields)
 * Omits id, createdAt, and updatedAt which are generated automatically
 *
 * @example
 * ```typescript
 * const newInvoiceData: CreateInvoiceData<'sales'> = {
 *   ruc: '12345678901',
 *   businessName: 'Company Name',
 *   // ... other fields (but not id, createdAt, updatedAt)
 * };
 * ```
 */
export type CreateInvoiceData<T extends InvoiceType> =
  Omit<InvoiceMap<T>, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Generic invoice union type
 */
export type Invoice = import('@/features/sales/types/sales.types').SalesInvoice |
                       import('@/features/purchases/types/purchases.types').PurchaseInvoice;

/**
 * Export formats supported by the application
 */
export type ExportFormat = 'csv' | 'txt' | 'excel';

/**
 * Import formats supported by the application
 */
export enum ImportFormat {
  CSV = 'csv',
  TXT = 'txt'
}