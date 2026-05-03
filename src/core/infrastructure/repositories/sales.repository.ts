import { DatabaseService } from '../database/database.service';
import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { SalesRepository as ISalesRepository } from '@/core/domain/repositories/invoice.repository';
import type { PeriodRepository } from '@/core/domain/repositories';
import { PeriodUtils } from '@/core/domain/entities/period.entity';
import { queryCache } from '@/shared/lib/cache/query-cache';
import { SALES_RECORD_COLUMNS, SALES_BATCH_SIZE } from '@/shared/constants/database.constants';
import { SALES_ALLOWED_FIELDS, type CreatableSalesInvoice } from '@/shared/constants/field-registry';
import { camelToSnake } from '@/shared/lib/utils/case-converter';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';

/**
 * Sales Repository
 * Handles all database operations for sales_records table
 *
 * This repository implements the Single Responsibility Principle:
 * it ONLY manages the sales_records table and delegates period metadata
 * updates to PeriodRepository.
 */
export class SalesRepository implements ISalesRepository {
  private db: DatabaseService;
  private periodRepo: PeriodRepository;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.periodRepo = RepositoryFactory.getPeriodRepository();
  }

  /**
   * ===== CREATE OPERATIONS =====
   */

  /**
   * Creates a single sales record
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param invoice - Sales invoice data (without id, createdAt, updatedAt)
   * @returns Created invoice with generated ID
   */
  async create(
    companyId: number,
    periodCode: string,
    invoice: CreatableSalesInvoice
  ): Promise<SalesInvoice> {
    if (!PeriodUtils.isValidPeriodCode(periodCode)) {
      throw new Error('Código de periodo inválido');
    }

    const result = await this.db.execute(
      `INSERT INTO sales_records (
        company_id, ruc, business_name, period,
        sunat_correlative,
        issue_date, due_date,
        voucher_type, voucher_series, voucher_number, voucher_end_number,
        customer_doc_type, customer_doc_number, customer_name,
        export_value, taxable_base, taxable_base_discount,
        vat_amount, vat_discount, exempt_amount, unaffected_amount,
        selective_consumption_tax, rice_vat_base, rice_vat, plastic_bag_tax,
        other_taxes, total_amount,
        currency, exchange_rate,
        modified_voucher_date, modified_voucher_type,
        modified_voucher_series, modified_voucher_number,
        attribution_project_id, note_type, voucher_status,
        fob_shipped_value, free_operations_value, operation_type,
        dam_cp, free_use_field, vat_percentage
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        companyId,
        this.formatText(invoice.ruc),
        this.formatText(invoice.businessName),
        periodCode,
        this.formatText(invoice.sunatCorrelative),
        invoice.issueDate || null,
        invoice.dueDate || null,
        this.formatText(invoice.voucherType),
        this.formatText(invoice.voucherSeries),
        this.formatText(invoice.voucherNumber),
        this.formatText(invoice.voucherEndNumber),
        this.formatText(invoice.customerDocType),
        this.formatText(invoice.customerDocNumber),
        this.formatText(invoice.customerName),
        this.formatNumeric(invoice.exportValue),
        this.formatNumeric(invoice.taxableBase),
        this.formatNumeric(invoice.taxableBaseDiscount),
        this.formatNumeric(invoice.vatAmount),
        this.formatNumeric(invoice.vatDiscount),
        this.formatNumeric(invoice.exemptAmount),
        this.formatNumeric(invoice.unaffectedAmount),
        this.formatNumeric(invoice.selectiveConsumptionTax),
        this.formatNumeric(invoice.riceVatBase),
        this.formatNumeric(invoice.riceVat),
        this.formatNumeric(invoice.plasticBagTax),
        this.formatNumeric(invoice.otherTaxes),
        this.formatNumeric(invoice.totalAmount),
        this.formatText(invoice.currency),
        this.formatNumeric(invoice.exchangeRate, 4),
        invoice.modifiedVoucherDate || null,
        this.formatText(invoice.modifiedVoucherType),
        this.formatText(invoice.modifiedVoucherSeries),
        this.formatText(invoice.modifiedVoucherNumber),
        this.formatText(invoice.attributionProjectId),
        this.formatText(invoice.noteType),
        this.formatText(invoice.voucherStatus),
        this.formatNumeric(invoice.fobShippedValue),
        this.formatNumeric(invoice.freeOperationsValue),
        this.formatText(invoice.operationType),
        this.formatText(invoice.damCp),
        this.formatText(invoice.freeUseField),
        this.formatNumeric(invoice.vatPercentage, 2)
      ]
    );

    // Update period metadata
    const records = await this.getAll(companyId, periodCode);
    const totalAmount = records.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    await this.periodRepo.update(companyId, periodCode, 'sales', records.length, totalAmount);

    // Invalidate cache
    this.invalidateCache(companyId, periodCode);

    const created = await this.getById(result.lastInsertId as number);
    if (!created) {
      throw new Error('Failed to retrieve created record');
    }
    return created;
  }

  /**
   * Creates multiple sales records in a single bulk operation
   *
   * This is an atomic operation that ONLY inserts records.
   * It does NOT:
   * - Delete existing records (use deleteByPeriod() or replacePeriodRecords() for that)
   * - Update period metadata (caller is responsible)
   *
   * After all records are inserted, invalidates cache once.
   *
   * Uses batching to avoid SQLite parameter limits:
   * - 42 columns × 100 records = 4,200 parameters per batch
   *
   * @param companyId - Company ID
   * @param periodCode - Period code in YYYYMM format
   * @param records - Array of sales invoices to insert
   * @throws Error if insert fails
   *
   * @example
   * // Append new records without deleting existing ones
   * await salesRepo.bulkCreate(1, '202401', newRecords);
   */
  async bulkCreate(companyId: number, periodCode: string, records: SalesInvoice[]): Promise<void> {
    if (records.length === 0) {
      return;
    }


    const chunkSize = SALES_BATCH_SIZE;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      if (chunk.length === 0) continue;


      // Build placeholders for this chunk
      const placeholders = chunk.map(() => `(${Array(SALES_RECORD_COLUMNS).fill('?').join(', ')})`).join(',');

      const values: unknown[] = [];
      for (const record of chunk) {
        values.push(
          companyId,
          this.formatText(record.ruc),
          this.formatText(record.businessName),
          periodCode,
          this.formatText(record.sunatCorrelative),
          record.issueDate || null,
          record.dueDate || null,
          this.formatText(record.voucherType),
          this.formatText(record.voucherSeries),
          this.formatText(record.voucherNumber),
          this.formatText(record.voucherEndNumber),
          this.formatText(record.customerDocType),
          this.formatText(record.customerDocNumber),
          this.formatText(record.customerName),
          this.formatNumeric(record.exportValue),
          this.formatNumeric(record.taxableBase),
          this.formatNumeric(record.taxableBaseDiscount),
          this.formatNumeric(record.vatAmount),
          this.formatNumeric(record.vatDiscount),
          this.formatNumeric(record.exemptAmount),
          this.formatNumeric(record.unaffectedAmount),
          this.formatNumeric(record.selectiveConsumptionTax),
          this.formatNumeric(record.riceVatBase),
          this.formatNumeric(record.riceVat),
          this.formatNumeric(record.plasticBagTax),
          this.formatNumeric(record.otherTaxes),
          this.formatNumeric(record.totalAmount),
          this.formatText(record.currency),
          this.formatNumeric(record.exchangeRate, 4),
          record.modifiedVoucherDate || null,
          this.formatText(record.modifiedVoucherType),
          this.formatText(record.modifiedVoucherSeries),
          this.formatText(record.modifiedVoucherNumber),
          this.formatText(record.attributionProjectId),
          this.formatText(record.noteType),
          this.formatText(record.voucherStatus),
          this.formatNumeric(record.fobShippedValue),
          this.formatNumeric(record.freeOperationsValue),
          this.formatText(record.operationType),
          this.formatText(record.damCp),
          this.formatText(record.freeUseField),
          this.formatNumeric(record.vatPercentage, 2)
        );
      }

      // Execute INSERT for this chunk
      await this.db.execute(
        `INSERT INTO sales_records (
          company_id, ruc, business_name, period,
          sunat_correlative,
          issue_date, due_date,
          voucher_type, voucher_series, voucher_number, voucher_end_number,
          customer_doc_type, customer_doc_number, customer_name,
          export_value, taxable_base, taxable_base_discount,
          vat_amount, vat_discount, exempt_amount, unaffected_amount,
          selective_consumption_tax, rice_vat_base, rice_vat, plastic_bag_tax,
          other_taxes, total_amount,
          currency, exchange_rate,
          modified_voucher_date, modified_voucher_type,
          modified_voucher_series, modified_voucher_number,
          attribution_project_id, note_type, voucher_status,
          fob_shipped_value, free_operations_value, operation_type,
          dam_cp, free_use_field, vat_percentage
        ) VALUES ${placeholders}`,
        values
      );
    }


    // Invalidate cache once after all chunks are processed
    this.invalidateCache(companyId, periodCode);
  }

  /**
   * Replaces ALL records for a period with new data (complete overwrite)
   *
   * This is a destructive operation that:
   * 1. Deletes all existing records for the period (via deleteByPeriod)
   * 2. Inserts new records (via bulkCreate - also invalidates cache)
   * 3. Updates period metadata
   *
   * WARNING: This cannot be undone. Old data is permanently deleted.
   *
   * @param companyId - Company ID
   * @param periodCode - Period code in YYYYMM format
   * @param records - New records to save (replaces all existing)
   * @throws Error if period code is invalid or operations fail
   *
   * @example
   * // Import SUNAT CSV - replaces all January 2024 data
   * await salesRepo.replacePeriodRecords(1, '202401', importedRecords);
   */
  async replacePeriodRecords(companyId: number, periodCode: string, records: SalesInvoice[]): Promise<void> {

    // Validate period
    if (!PeriodUtils.isValidPeriodCode(periodCode)) {
      throw new Error('Código de periodo inválido');
    }

    // Step 1: Delete all existing records for this period
    await this.deleteByPeriod(companyId, periodCode);

    // Step 2: Insert new records (if any)
    if (records.length > 0) {
      // Detect duplicates (warning only, doesn't block)
      const invoiceNumbers = records.map((r) => `${r.voucherSeries}-${r.voucherNumber}`);
      const uniqueNumbers = new Set(invoiceNumbers);
      const duplicateCount = invoiceNumbers.length - uniqueNumbers.size;

      if (duplicateCount > 0) {
        // Duplicates detected - warning only
      }

      await this.bulkCreate(companyId, periodCode, records); // Invalidates cache internally

      // Step 3: Update period metadata
      const totalAmount = records.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      await this.periodRepo.update(companyId, periodCode, 'sales', records.length, totalAmount);
    }
  }

  /**
   * ===== READ OPERATIONS =====
   */

  /**
   * Gets all sales records for a period
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @returns Array of sales invoices
   */
  async getAll(companyId: number, periodCode: string): Promise<SalesInvoice[]> {
    const records = await this.db.select<Record<string, unknown>>(
      `SELECT * FROM sales_records
       WHERE company_id = ? AND period = ?
       ORDER BY id`,
      [companyId, periodCode]
    );

    return records.map(this.mapRecordToInvoice);
  }

  /**
   * Gets a single sales record by ID
   *
   * @param id - Record ID
   * @returns Sales invoice or null if not found
   */
  async getById(id: number): Promise<SalesInvoice | null> {
    const records = await this.db.select<Record<string, unknown>>(`SELECT * FROM sales_records WHERE id = ?`, [id]);

    if (records.length === 0) {
      return null;
    }

    return this.mapRecordToInvoice(records[0]);
  }

  /**
   * ===== UPDATE OPERATIONS =====
   */

  /**
   * Updates a single field in a sales record
   *
   * Optimized for inline editing where users change one cell at a time.
   * Use updateFields() when multiple fields need to be updated together.
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param recordId - Database ID of the record
   * @param fieldName - TypeScript field name to update
   * @param value - New value for the field
   */
  async updateField(
    companyId: number,
    periodCode: string,
    recordId: number,
    fieldName: string,
    value: string | number | null
  ): Promise<void> {

    const dbColumnName = camelToSnake(fieldName);

    // Validate field is allowed
    if (!this.isAllowedField(fieldName)) {
      throw new Error(`Invalid field name: ${fieldName}. Field not allowed for updates.`);
    }

    // Format value
    const formattedValue = this.formatValueByType(value);

    // Execute UPDATE
    const result = await this.db.execute(
      `UPDATE sales_records
       SET ${dbColumnName} = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ? AND period = ?`,
      [formattedValue, recordId, companyId, periodCode]
    );

    if (result.rowsAffected === 0) {
      throw new Error('Registro no encontrado o sin permisos para actualizarlo');
    }

    // Invalidate cache
    this.invalidateCache(companyId, periodCode);
  }

  /**
   * P Updates multiple fields in a sales record with a SINGLE query
   *
   * This is the OPTIMIZED method for updating multiple related fields at once,
   * such as when editing taxableBase triggers recalculation of vatAmount,
   * totalAmount, and vatPercentage.
   *
   * BEFORE (4 separate queries):
   *   UPDATE sales_records SET taxable_base = 150 WHERE id = 5;
   *   UPDATE sales_records SET vat_amount = 27 WHERE id = 5;
   *   UPDATE sales_records SET total_amount = 177 WHERE id = 5;
   *   UPDATE sales_records SET vat_percentage = 18 WHERE id = 5;
   *
   * AFTER (1 optimized query):
   *   UPDATE sales_records
   *   SET taxable_base = 150, vat_amount = 27, total_amount = 177, vat_percentage = 18
   *   WHERE id = 5;
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param recordId - Database ID of the record
   * @param fields - Object with field names and their new values
   *
   * @example
   * await salesRepo.updateFields(1, '202401', 5, {
   *   taxableBase: 150,
   *   vatAmount: 27,
   *   totalAmount: 177,
   *   vatPercentage: 18
   * });
   */
  async updateFields(
    companyId: number,
    periodCode: string,
    recordId: number,
    fields: Record<string, string | number | null>
  ): Promise<void> {

    // Validate all fields are allowed
    const fieldNames = Object.keys(fields);
    for (const field of fieldNames) {
      if (!this.isAllowedField(field)) {
        throw new Error(`Invalid field name: ${field}. Field not allowed for updates.`);
      }
    }

    // Build SET clause dynamically
    const setClauses = fieldNames.map((f) => `${camelToSnake(f)} = ?`);
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    const setClause = setClauses.join(', ');

    // Format values
    const values = fieldNames.map((field) => this.formatValueByType(fields[field]));

    // Execute single UPDATE with multiple SET clauses
    const result = await this.db.execute(
      `UPDATE sales_records
       SET ${setClause}
       WHERE id = ? AND company_id = ? AND period = ?`,
      [...values, recordId, companyId, periodCode]
    );


    if (result.rowsAffected === 0) {
      throw new Error('Registro no encontrado o sin permisos para actualizarlo');
    }

    // Invalidate cache
    this.invalidateCache(companyId, periodCode);
  }

  /**
   * Updates an entire sales record
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param recordId - Database ID of the record
   * @param invoice - Partial invoice data to update
   * @returns Updated invoice
   */
  async update(
    companyId: number,
    periodCode: string,
    recordId: number,
    invoice: Partial<SalesInvoice>
  ): Promise<SalesInvoice> {
    // Build update fields from partial invoice
    const fields: Record<string, string | number | null> = {};

    // Map all provided fields
    if (invoice.ruc !== undefined) fields.ruc = invoice.ruc;
    if (invoice.businessName !== undefined) fields.businessName = invoice.businessName;
    if (invoice.sunatCorrelative !== undefined) fields.sunatCorrelative = invoice.sunatCorrelative;
    if (invoice.issueDate !== undefined) fields.issueDate = invoice.issueDate;
    if (invoice.dueDate !== undefined) fields.dueDate = invoice.dueDate;
    if (invoice.voucherType !== undefined) fields.voucherType = invoice.voucherType;
    if (invoice.voucherSeries !== undefined) fields.voucherSeries = invoice.voucherSeries;
    if (invoice.voucherNumber !== undefined) fields.voucherNumber = invoice.voucherNumber;
    if (invoice.voucherEndNumber !== undefined) fields.voucherEndNumber = invoice.voucherEndNumber;
    if (invoice.customerDocType !== undefined) fields.customerDocType = invoice.customerDocType;
    if (invoice.customerDocNumber !== undefined) fields.customerDocNumber = invoice.customerDocNumber;
    if (invoice.customerName !== undefined) fields.customerName = invoice.customerName;
    if (invoice.exportValue !== undefined) fields.exportValue = invoice.exportValue;
    if (invoice.taxableBase !== undefined) fields.taxableBase = invoice.taxableBase;
    if (invoice.taxableBaseDiscount !== undefined) fields.taxableBaseDiscount = invoice.taxableBaseDiscount;
    if (invoice.vatAmount !== undefined) fields.vatAmount = invoice.vatAmount;
    if (invoice.vatDiscount !== undefined) fields.vatDiscount = invoice.vatDiscount;
    if (invoice.exemptAmount !== undefined) fields.exemptAmount = invoice.exemptAmount;
    if (invoice.unaffectedAmount !== undefined) fields.unaffectedAmount = invoice.unaffectedAmount;
    if (invoice.selectiveConsumptionTax !== undefined) fields.selectiveConsumptionTax = invoice.selectiveConsumptionTax;
    if (invoice.riceVatBase !== undefined) fields.riceVatBase = invoice.riceVatBase;
    if (invoice.riceVat !== undefined) fields.riceVat = invoice.riceVat;
    if (invoice.plasticBagTax !== undefined) fields.plasticBagTax = invoice.plasticBagTax;
    if (invoice.otherTaxes !== undefined) fields.otherTaxes = invoice.otherTaxes;
    if (invoice.totalAmount !== undefined) fields.totalAmount = invoice.totalAmount;
    if (invoice.currency !== undefined) fields.currency = invoice.currency;
    if (invoice.exchangeRate !== undefined) fields.exchangeRate = invoice.exchangeRate;
    if (invoice.modifiedVoucherDate !== undefined) fields.modifiedVoucherDate = invoice.modifiedVoucherDate;
    if (invoice.modifiedVoucherType !== undefined) fields.modifiedVoucherType = invoice.modifiedVoucherType;
    if (invoice.modifiedVoucherSeries !== undefined) fields.modifiedVoucherSeries = invoice.modifiedVoucherSeries;
    if (invoice.modifiedVoucherNumber !== undefined) fields.modifiedVoucherNumber = invoice.modifiedVoucherNumber;
    if (invoice.attributionProjectId !== undefined) fields.attributionProjectId = invoice.attributionProjectId;
    if (invoice.noteType !== undefined) fields.noteType = invoice.noteType;
    if (invoice.voucherStatus !== undefined) fields.voucherStatus = invoice.voucherStatus;
    if (invoice.fobShippedValue !== undefined) fields.fobShippedValue = invoice.fobShippedValue;
    if (invoice.freeOperationsValue !== undefined) fields.freeOperationsValue = invoice.freeOperationsValue;
    if (invoice.operationType !== undefined) fields.operationType = invoice.operationType;
    if (invoice.damCp !== undefined) fields.damCp = invoice.damCp;
    if (invoice.freeUseField !== undefined) fields.freeUseField = invoice.freeUseField;
    if (invoice.vatPercentage !== undefined) fields.vatPercentage = invoice.vatPercentage;

    // Use updateFields for the update
    await this.updateFields(companyId, periodCode, recordId, fields);

    // Return updated record
    const updated = await this.getById(recordId);
    if (!updated) {
      throw new Error('Failed to retrieve updated record');
    }

    return updated;
  }

  /**
   * ===== DELETE OPERATIONS =====
   */

  /**
   * Deletes a single sales record
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param recordId - Database ID of the record to delete
   */
  async delete(companyId: number, periodCode: string, recordId: number): Promise<void> {
    const result = await this.db.execute(`DELETE FROM sales_records WHERE id = ? AND company_id = ? AND period = ?`, [
      recordId,
      companyId,
      periodCode
    ]);

    if (result.rowsAffected === 0) {
      throw new Error('Registro no encontrado o sin permisos para eliminarlo');
    }

    // Update period metadata
    const records = await this.getAll(companyId, periodCode);
    const totalAmount = records.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    await this.periodRepo.update(companyId, periodCode, 'sales', records.length, totalAmount);

    // Invalidate cache
    this.invalidateCache(companyId, periodCode);
  }

  /**
   * Deletes all sales records for a period
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   */
  async deleteByPeriod(companyId: number, periodCode: string): Promise<void> {
    await this.db.execute(`DELETE FROM sales_records WHERE company_id = ? AND period = ?`, [companyId, periodCode]);

    // Update period metadata (0 records)
    await this.periodRepo.update(companyId, periodCode, 'sales', 0, 0);

    // Invalidate cache
    this.invalidateCache(companyId, periodCode);
  }

  /**
   * ===== PRIVATE HELPER METHODS =====
   */

  /**
   * Maps database row to SalesInvoice entity
   */
  private mapRecordToInvoice = (row: Record<string, unknown>): SalesInvoice => {
    return {
      id: row.id as number,
      ruc: row.ruc as string,
      businessName: row.business_name as string | null,
      period: row.period as string,
      sunatCorrelative: row.sunat_correlative as string,
      issueDate: row.issue_date as string,
      dueDate: row.due_date as string | null,
      voucherType: row.voucher_type as string,
      voucherSeries: row.voucher_series as string,
      voucherNumber: row.voucher_number as string,
      voucherEndNumber: row.voucher_end_number as string | null,
      customerDocType: row.customer_doc_type as string,
      customerDocNumber: row.customer_doc_number as string,
      customerName: row.customer_name as string,
      exportValue: row.export_value !== null ? parseFloat(row.export_value as string) : null,
      taxableBase: row.taxable_base !== null ? parseFloat(row.taxable_base as string) : null,
      taxableBaseDiscount: row.taxable_base_discount !== null ? parseFloat(row.taxable_base_discount as string) : null,
      vatAmount: row.vat_amount !== null ? parseFloat(row.vat_amount as string) : null,
      vatDiscount: row.vat_discount !== null ? parseFloat(row.vat_discount as string) : null,
      exemptAmount: row.exempt_amount !== null ? parseFloat(row.exempt_amount as string) : null,
      unaffectedAmount: row.unaffected_amount !== null ? parseFloat(row.unaffected_amount as string) : null,
      selectiveConsumptionTax:
        row.selective_consumption_tax !== null ? parseFloat(row.selective_consumption_tax as string) : null,
      riceVatBase: row.rice_vat_base !== null ? parseFloat(row.rice_vat_base as string) : null,
      riceVat: row.rice_vat !== null ? parseFloat(row.rice_vat as string) : null,
      plasticBagTax: row.plastic_bag_tax !== null ? parseFloat(row.plastic_bag_tax as string) : null,
      otherTaxes: row.other_taxes !== null ? parseFloat(row.other_taxes as string) : null,
      totalAmount: row.total_amount !== null ? parseFloat(row.total_amount as string) : 0,
      currency: row.currency as string,
      exchangeRate: row.exchange_rate !== null ? parseFloat(row.exchange_rate as string) : 0,
      modifiedVoucherDate: row.modified_voucher_date as string | null,
      modifiedVoucherType: row.modified_voucher_type as string | null,
      modifiedVoucherSeries: row.modified_voucher_series as string | null,
      modifiedVoucherNumber: row.modified_voucher_number as string | null,
      attributionProjectId: row.attribution_project_id as string | null,
      noteType: row.note_type as string | null,
      voucherStatus: row.voucher_status as string | null,
      fobShippedValue: row.fob_shipped_value !== null ? parseFloat(row.fob_shipped_value as string) : null,
      freeOperationsValue: row.free_operations_value !== null ? parseFloat(row.free_operations_value as string) : null,
      operationType: row.operation_type as string | null,
      damCp: row.dam_cp as string | null,
      freeUseField: row.free_use_field as string | null,
      vatPercentage: row.vat_percentage !== null ? parseFloat(row.vat_percentage as string) : null,
      createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date()
    } as SalesInvoice;
  };

  /**
   * Validates if a field name is allowed for updates
   * Automatically derived from SALES_ALLOWED_FIELDS (SUNAT fields + calculated fields)
   * Excludes system fields: id, createdAt, updatedAt
   */
  private isAllowedField(fieldName: string): boolean {
    return (SALES_ALLOWED_FIELDS as readonly string[]).includes(fieldName);
  }

  /**
   * Formats value based on type
   */
  private formatValueByType(value: string | number | null | undefined): string | number | null {
    if (typeof value === 'number') {
      return value.toFixed(2);
    } else if (value === '' || value === undefined) {
      return null;
    }
    return value;
  }

  /**
   * Formats numeric values (floats) preserving NULL
   * Used for REAL database columns (amounts, percentages, exchange rates)
   *
   * @param value - Numeric value (already converted from string in transform layer)
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted string with fixed decimals or null
   */
  private formatNumeric(value: number | null | undefined, decimals: number = 2): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    // Value should already be a number from transform layer
    // If it's somehow still a string, convert it as fallback
    const numValue = typeof value === 'number' ? value : Number(value);

    // Return null for invalid numbers
    if (isNaN(numValue)) {
      return null;
    }

    return numValue.toFixed(decimals);
  }

  /**
   * Formats text values preserving NULL
   */
  private formatText(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return value;
  }

  /**
   * Invalidates cache for sales records
   */
  private invalidateCache(companyId: number, periodCode: string): void {
    const year = parseInt(periodCode.substring(0, 4));
    queryCache.invalidateSales(companyId);
    queryCache.invalidatePeriod(companyId, periodCode);
    queryCache.invalidateYear(companyId, year);
  }
}
