/**
 * Invoice Repository Contract (Generic for Sales & Purchases)
 *
 * Defines the interface for invoice data operations.
 * Each repository follows CRUD naming conventions for consistency.
 */

import type { InvoiceType, InvoiceMap } from '@/shared/types/invoice.types';

/**
 * Generic invoice repository contract
 * T = 'sales' | 'purchases'
 *
 * This interface defines the complete API for invoice management,
 * following standard CRUD conventions with optimized bulk operations.
 */
export interface InvoiceRepository<T extends InvoiceType> {
  /**
   * ===== CREATE OPERATIONS =====
   */

  /**
   * Creates a single invoice record
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM format)
   * @param invoice - Invoice data (without id, createdAt, updatedAt)
   * @returns Created invoice with generated ID
   */
  create(
    companyId: number,
    periodCode: string,
    invoice: Omit<InvoiceMap<T>, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<InvoiceMap<T>>;

  /**
   * Creates multiple invoice records in a single bulk operation (INSERT only)
   *
   * This is an atomic operation that ONLY inserts records.
   * It does NOT delete existing records, update metadata, or invalidate cache.
   *
   * Use this for append scenarios or when you need fine-grained control.
   * For complete period replacement, use replacePeriodRecords() instead.
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM format)
   * @param records - Array of invoices to insert
   *
   * @example
   * // Append new records without deleting existing ones
   * await salesRepo.bulkCreate(1, '202401', newRecords);
   */
  bulkCreate(companyId: number, periodCode: string, records: InvoiceMap<T>[]): Promise<void>;

  /**
   * Replaces ALL records for a period with new data (complete overwrite)
   *
   * This is a destructive operation that:
   * 1. Deletes all existing records for the period (via deleteByPeriod)
   * 2. Inserts new records (via bulkCreate)
   * 3. Updates period metadata
   * 4. Invalidates cache
   *
   * WARNING: This cannot be undone. Old data is permanently deleted.
   *
   * Use this for SUNAT CSV imports where you want to replace all period data.
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM format)
   * @param records - New records to save (replaces all existing)
   *
   * @example
   * // Import SUNAT CSV - replaces all January 2024 data
   * await salesRepo.replacePeriodRecords(1, '202401', importedRecords);
   */
  replacePeriodRecords(companyId: number, periodCode: string, records: InvoiceMap<T>[]): Promise<void>;

  /**
   * ===== READ OPERATIONS =====
   */

  /**
   * Gets all invoices for a specific period
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM format)
   * @returns Array of invoices
   */
  getAll(companyId: number, periodCode: string): Promise<InvoiceMap<T>[]>;

  /**
   * Gets a single invoice by ID
   *
   * @param id - Record ID
   * @returns Invoice or null if not found
   */
  getById(id: number): Promise<InvoiceMap<T> | null>;

  /**
   * ===== UPDATE OPERATIONS =====
   */

  /**
   * Updates a single field in an invoice
   *
   * Optimized for inline cell editing where only one field changes at a time.
   * For multiple related fields, use updateFields() instead.
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM format)
   * @param recordId - Database ID of the record
   * @param fieldName - TypeScript field name to update
   * @param value - New value for the field
   */
  updateField(
    companyId: number,
    periodCode: string,
    recordId: number,
    fieldName: string,
    value: string | number | null
  ): Promise<void>;

  /**
   * ⭐ Updates multiple fields in an invoice with a SINGLE database query
   *
   * This is the OPTIMIZED method for updating multiple related fields at once.
   * Instead of executing N separate UPDATE queries, this executes ONE query
   * with multiple SET clauses.
   *
   * Example use case: When editing taxableBase, we need to update:
   * - taxableBase
   * - vatAmount (calculated)
   * - totalAmount (calculated)
   * - vatPercentage (calculated)
   *
   * BEFORE (4 queries):
   *   UPDATE table SET taxable_base = 150 WHERE id = 5;
   *   UPDATE table SET vat_amount = 27 WHERE id = 5;
   *   UPDATE table SET total_amount = 177 WHERE id = 5;
   *   UPDATE table SET vat_percentage = 18 WHERE id = 5;
   *
   * AFTER (1 query):
   *   UPDATE table SET taxable_base = 150, vat_amount = 27,
   *                    total_amount = 177, vat_percentage = 18
   *   WHERE id = 5;
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM format)
   * @param recordId - Database ID of the record
   * @param fields - Object with field names and their new values
   */
  updateFields(
    companyId: number,
    periodCode: string,
    recordId: number,
    fields: Record<string, string | number | null>
  ): Promise<void>;

  /**
   * Updates an entire invoice record
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM format)
   * @param recordId - Database ID of the record
   * @param invoice - Partial invoice data to update
   * @returns Updated invoice
   */
  update(
    companyId: number,
    periodCode: string,
    recordId: number,
    invoice: Partial<InvoiceMap<T>>
  ): Promise<InvoiceMap<T>>;

  /**
   * ===== DELETE OPERATIONS =====
   */

  /**
   * Deletes a single invoice record
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM format)
   * @param recordId - Database ID of the record to delete
   */
  delete(companyId: number, periodCode: string, recordId: number): Promise<void>;

  /**
   * Deletes all invoice records for a period
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM format)
   */
  deleteByPeriod(companyId: number, periodCode: string): Promise<void>;
}

/**
 * Sales invoice repository contract
 *
 * Provides type-safe operations for sales invoices by fixing the generic type to 'sales'.
 * Manages the sales_records table exclusively.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SalesRepository extends InvoiceRepository<'sales'> {}

/**
 * Purchase invoice repository contract
 *
 * Provides type-safe operations for purchase invoices by fixing the generic type to 'purchases'.
 * Manages the purchase_records table exclusively.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PurchasesRepository extends InvoiceRepository<'purchases'> {}
