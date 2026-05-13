import { DatabaseService } from '../database/database.service';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';
import type { PurchasesRepository as IPurchasesRepository } from '@/core/domain/repositories/invoice.repository';
import type { PeriodRepository } from '@/core/domain/repositories';
import { PeriodUtils } from '@/core/domain/entities/period.entity';
import { queryCache } from '@/shared/lib/cache/query-cache';
import { PURCHASE_RECORD_COLUMNS, PURCHASES_BATCH_SIZE } from '@/shared/constants/database.constants';
import {
  PURCHASE_ALLOWED_FIELDS,
  PURCHASE_SUNAT_COLUMNS_MAPPING,
  type CreatablePurchaseInvoice
} from '@/shared/constants/field-registry';
import { camelToSnake } from '@/shared/lib/utils/case-converter';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';

/**
 * Purchases Repository
 * Handles all database operations for purchase_records table
 *
 * This repository implements the Single Responsibility Principle:
 * it ONLY manages the purchase_records table and delegates period metadata
 * updates to PeriodRepository.
 *
 * API is consistent with SalesRepository for maintainability.
 */
export class PurchasesRepository implements IPurchasesRepository {
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
   * Creates a single purchase record
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param invoice - Purchase invoice data (without id, createdAt, updatedAt)
   * @returns Created invoice with generated ID
   */
  async create(companyId: number, periodCode: string, invoice: CreatablePurchaseInvoice): Promise<PurchaseInvoice> {
    if (!PeriodUtils.isValidPeriodCode(periodCode)) {
      throw new Error('Código de periodo inválido');
    }

    const newId = await this.db.transaction(async () => {
      const result = await this.insertOne(companyId, periodCode, invoice);
      await this.refreshPeriodMetadata(companyId, periodCode);
      return result.lastInsertId as number;
    });

    this.invalidateCache(companyId, periodCode);

    const created = await this.getById(newId, companyId);
    if (!created) {
      throw new Error('Failed to retrieve created record');
    }
    return created;
  }

  /**
   * Inserts a single purchase record (no transaction, no metadata update)
   */
  private async insertOne(companyId: number, periodCode: string, invoice: CreatablePurchaseInvoice) {
    return this.db.execute(
      `INSERT INTO purchase_records (
        company_id, ruc, business_name, period,
        sunat_correlative,
        issue_date, due_date,
        voucher_type, voucher_series, customs_year, voucher_number_start, voucher_number_end,
        supplier_doc_type, supplier_doc_number, supplier_name,
        taxable_base_taxed, vat_amount_taxed,
        taxable_base_mixed, vat_amount_mixed,
        taxable_base_untaxed, vat_amount_untaxed,
        non_taxable_value,
        selective_consumption_tax, plastic_bag_tax, other_taxes, total_amount,
        currency, exchange_rate,
        modified_voucher_date, modified_voucher_type,
        modified_voucher_series, dam_code, modified_voucher_number,
        goods_services_class, operators_project_id,
        participation_percentage, municipal_bingo_tax, car_export_import_indicator,
        detraction, note_type, voucher_status, inconsistency_indicator,
        free_use_field1, free_use_field2, free_use_field3, free_use_field4, free_use_field5,
        free_use_field6, free_use_field7, free_use_field8, free_use_field9, free_use_field10,
        free_use_field11, free_use_field12, free_use_field13, free_use_field14, free_use_field15,
        free_use_field16, free_use_field17, free_use_field18, free_use_field19, free_use_field20,
        free_use_field21, free_use_field22, free_use_field23, free_use_field24, free_use_field25,
        free_use_field26, free_use_field27, free_use_field28, free_use_field29, free_use_field30,
        free_use_field31, free_use_field32, free_use_field33, free_use_field34, free_use_field35,
        free_use_field36, free_use_field37, free_use_field38, free_use_field39,
        vat_percentage
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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
        this.formatText(invoice.customsYear),
        this.formatText(invoice.voucherNumberStart),
        this.formatText(invoice.voucherNumberEnd),
        this.formatText(invoice.supplierDocType),
        this.formatText(invoice.supplierDocNumber),
        this.formatText(invoice.supplierName),
        this.formatNumeric(invoice.taxableBaseTaxed),
        this.formatNumeric(invoice.vatAmountTaxed),
        this.formatNumeric(invoice.taxableBaseMixed),
        this.formatNumeric(invoice.vatAmountMixed),
        this.formatNumeric(invoice.taxableBaseUntaxed),
        this.formatNumeric(invoice.vatAmountUntaxed),
        this.formatNumeric(invoice.nonTaxableValue),
        this.formatNumeric(invoice.selectiveConsumptionTax),
        this.formatNumeric(invoice.plasticBagTax),
        this.formatNumeric(invoice.otherTaxes),
        this.formatNumeric(invoice.totalAmount),
        this.formatText(invoice.currency),
        this.formatNumeric(invoice.exchangeRate, 4),
        invoice.modifiedVoucherDate || null,
        this.formatText(invoice.modifiedVoucherType),
        this.formatText(invoice.modifiedVoucherSeries),
        this.formatText(invoice.damCode),
        this.formatText(invoice.modifiedVoucherNumber),
        this.formatText(invoice.goodsServicesClass),
        this.formatText(invoice.operatorsProjectId),
        this.formatNumeric(invoice.participationPercentage),
        this.formatText(invoice.municipalBingoTax),
        this.formatText(invoice.carExportImportIndicator),
        this.formatText(invoice.detraction),
        this.formatText(invoice.noteType),
        this.formatText(invoice.voucherStatus),
        this.formatText(invoice.inconsistencyIndicator),
        // 39 CLU fields
        this.formatText(invoice.freeUseField1),
        this.formatText(invoice.freeUseField2),
        this.formatText(invoice.freeUseField3),
        this.formatText(invoice.freeUseField4),
        this.formatText(invoice.freeUseField5),
        this.formatText(invoice.freeUseField6),
        this.formatText(invoice.freeUseField7),
        this.formatText(invoice.freeUseField8),
        this.formatText(invoice.freeUseField9),
        this.formatText(invoice.freeUseField10),
        this.formatText(invoice.freeUseField11),
        this.formatText(invoice.freeUseField12),
        this.formatText(invoice.freeUseField13),
        this.formatText(invoice.freeUseField14),
        this.formatText(invoice.freeUseField15),
        this.formatText(invoice.freeUseField16),
        this.formatText(invoice.freeUseField17),
        this.formatText(invoice.freeUseField18),
        this.formatText(invoice.freeUseField19),
        this.formatText(invoice.freeUseField20),
        this.formatText(invoice.freeUseField21),
        this.formatText(invoice.freeUseField22),
        this.formatText(invoice.freeUseField23),
        this.formatText(invoice.freeUseField24),
        this.formatText(invoice.freeUseField25),
        this.formatText(invoice.freeUseField26),
        this.formatText(invoice.freeUseField27),
        this.formatText(invoice.freeUseField28),
        this.formatText(invoice.freeUseField29),
        this.formatText(invoice.freeUseField30),
        this.formatText(invoice.freeUseField31),
        this.formatText(invoice.freeUseField32),
        this.formatText(invoice.freeUseField33),
        this.formatText(invoice.freeUseField34),
        this.formatText(invoice.freeUseField35),
        this.formatText(invoice.freeUseField36),
        this.formatText(invoice.freeUseField37),
        this.formatText(invoice.freeUseField38),
        this.formatText(invoice.freeUseField39),
        this.formatNumeric(invoice.vatPercentage, 2)
      ]
    );
  }

  /**
   * Refreshes period metadata using a single aggregation query.
   * Must be called inside a transaction to avoid race conditions.
   */
  private async refreshPeriodMetadata(companyId: number, periodCode: string): Promise<void> {
    const rows = await this.db.select<{ count: number; total: number | null }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
         FROM purchase_records
        WHERE company_id = ? AND period = ?`,
      [companyId, periodCode]
    );
    const { count, total } = rows[0] ?? { count: 0, total: 0 };
    await this.periodRepo.update(companyId, periodCode, 'purchases', count, total ?? 0);
  }

  /**
   * Creates multiple purchase records in a single bulk operation
   *
   * Due to the large number of columns (81), records are inserted in chunks of 50
   * to avoid SQLite parameter limits and optimize performance.
   *
   * This is an atomic operation that ONLY inserts records.
   * It does NOT:
   * - Delete existing records (use deleteByPeriod() or replacePeriodRecords() for that)
   * - Update period metadata (caller is responsible)
   *
   * After all records are inserted, invalidates cache once.
   *
   * @param companyId - Company ID
   * @param periodCode - Period code in YYYYMM format
   * @param records - Array of purchase invoices to insert
   * @throws Error if insert fails
   *
   * @example
   * // Append new records without deleting existing ones
   * await purchasesRepo.bulkCreate(1, '202401', newRecords);
   */
  async bulkCreate(companyId: number, periodCode: string, records: PurchaseInvoice[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const chunkSize = PURCHASES_BATCH_SIZE;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      if (chunk.length === 0) continue;

      const placeholders = chunk.map(() => `(${Array(PURCHASE_RECORD_COLUMNS).fill('?').join(', ')})`).join(',');

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
          this.formatText(record.customsYear),
          this.formatText(record.voucherNumberStart),
          this.formatText(record.voucherNumberEnd),
          this.formatText(record.supplierDocType),
          this.formatText(record.supplierDocNumber),
          this.formatText(record.supplierName),
          this.formatNumeric(record.taxableBaseTaxed),
          this.formatNumeric(record.vatAmountTaxed),
          this.formatNumeric(record.taxableBaseMixed),
          this.formatNumeric(record.vatAmountMixed),
          this.formatNumeric(record.taxableBaseUntaxed),
          this.formatNumeric(record.vatAmountUntaxed),
          this.formatNumeric(record.nonTaxableValue),
          this.formatNumeric(record.selectiveConsumptionTax),
          this.formatNumeric(record.plasticBagTax),
          this.formatNumeric(record.otherTaxes),
          this.formatNumeric(record.totalAmount),
          this.formatText(record.currency),
          this.formatNumeric(record.exchangeRate, 4),
          record.modifiedVoucherDate || null,
          this.formatText(record.modifiedVoucherType),
          this.formatText(record.modifiedVoucherSeries),
          this.formatText(record.damCode),
          this.formatText(record.modifiedVoucherNumber),
          this.formatText(record.goodsServicesClass),
          this.formatText(record.operatorsProjectId),
          this.formatNumeric(record.participationPercentage),
          this.formatText(record.municipalBingoTax),
          this.formatText(record.carExportImportIndicator),
          this.formatText(record.detraction),
          this.formatText(record.noteType),
          this.formatText(record.voucherStatus),
          this.formatText(record.inconsistencyIndicator),
          // 39 CLU fields
          this.formatText(record.freeUseField1),
          this.formatText(record.freeUseField2),
          this.formatText(record.freeUseField3),
          this.formatText(record.freeUseField4),
          this.formatText(record.freeUseField5),
          this.formatText(record.freeUseField6),
          this.formatText(record.freeUseField7),
          this.formatText(record.freeUseField8),
          this.formatText(record.freeUseField9),
          this.formatText(record.freeUseField10),
          this.formatText(record.freeUseField11),
          this.formatText(record.freeUseField12),
          this.formatText(record.freeUseField13),
          this.formatText(record.freeUseField14),
          this.formatText(record.freeUseField15),
          this.formatText(record.freeUseField16),
          this.formatText(record.freeUseField17),
          this.formatText(record.freeUseField18),
          this.formatText(record.freeUseField19),
          this.formatText(record.freeUseField20),
          this.formatText(record.freeUseField21),
          this.formatText(record.freeUseField22),
          this.formatText(record.freeUseField23),
          this.formatText(record.freeUseField24),
          this.formatText(record.freeUseField25),
          this.formatText(record.freeUseField26),
          this.formatText(record.freeUseField27),
          this.formatText(record.freeUseField28),
          this.formatText(record.freeUseField29),
          this.formatText(record.freeUseField30),
          this.formatText(record.freeUseField31),
          this.formatText(record.freeUseField32),
          this.formatText(record.freeUseField33),
          this.formatText(record.freeUseField34),
          this.formatText(record.freeUseField35),
          this.formatText(record.freeUseField36),
          this.formatText(record.freeUseField37),
          this.formatText(record.freeUseField38),
          this.formatText(record.freeUseField39),
          this.formatNumeric(record.vatPercentage, 2)
        );
      }

      await this.db.execute(
        `INSERT INTO purchase_records (
          company_id, ruc, business_name, period,
          sunat_correlative,
          issue_date, due_date,
          voucher_type, voucher_series, customs_year, voucher_number_start, voucher_number_end,
          supplier_doc_type, supplier_doc_number, supplier_name,
          taxable_base_taxed, vat_amount_taxed,
          taxable_base_mixed, vat_amount_mixed,
          taxable_base_untaxed, vat_amount_untaxed,
          non_taxable_value,
          selective_consumption_tax, plastic_bag_tax, other_taxes, total_amount,
          currency, exchange_rate,
          modified_voucher_date, modified_voucher_type,
          modified_voucher_series, dam_code, modified_voucher_number,
          goods_services_class, operators_project_id,
          participation_percentage, municipal_bingo_tax, car_export_import_indicator,
          detraction, note_type, voucher_status, inconsistency_indicator,
          free_use_field1, free_use_field2, free_use_field3, free_use_field4, free_use_field5,
          free_use_field6, free_use_field7, free_use_field8, free_use_field9, free_use_field10,
          free_use_field11, free_use_field12, free_use_field13, free_use_field14, free_use_field15,
          free_use_field16, free_use_field17, free_use_field18, free_use_field19, free_use_field20,
          free_use_field21, free_use_field22, free_use_field23, free_use_field24, free_use_field25,
          free_use_field26, free_use_field27, free_use_field28, free_use_field29, free_use_field30,
          free_use_field31, free_use_field32, free_use_field33, free_use_field34, free_use_field35,
          free_use_field36, free_use_field37, free_use_field38, free_use_field39,
          vat_percentage
        ) VALUES ${placeholders}`,
        values
      );
    }

    // Invalidate cache once after all chunks are processed
    this.invalidateCache(companyId, periodCode);
  }

  /**
   * Saves multiple purchase records with batch insert (replaces existing data)
   *
   * This function performs a complete replacement of purchase records for a given period,
   * deleting all existing records and inserting new ones in optimized chunks.
   *
   * @param companyId - Company ID
   * @param periodCode - Period code in YYYYMM format
   * @param records - Array of purchase invoices to save
   */
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
   * await purchasesRepo.replacePeriodRecords(1, '202401', importedRecords);
   */
  async replacePeriodRecords(companyId: number, periodCode: string, records: PurchaseInvoice[]): Promise<void> {
    if (!PeriodUtils.isValidPeriodCode(periodCode)) {
      throw new Error('Código de periodo inválido');
    }

    await this.db.transaction(async () => {
      await this.deleteByPeriod(companyId, periodCode);

      if (records.length > 0) {
        await this.bulkCreate(companyId, periodCode, records);

        const totalAmount = records.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        await this.periodRepo.update(companyId, periodCode, 'purchases', records.length, totalAmount);
      }
    });
  }

  /**
   * ===== READ OPERATIONS =====
   */

  /**
   * Gets all purchase records for a period
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @returns Array of purchase invoices
   */
  async getAll(companyId: number, periodCode: string): Promise<PurchaseInvoice[]> {
    const records = await this.db.select<Record<string, unknown>>(
      `SELECT * FROM purchase_records
       WHERE company_id = ? AND period = ?
       ORDER BY id`,
      [companyId, periodCode]
    );

    return records.map((row) => this.mapRecordToInvoice(row));
  }

  /**
   * Gets a single purchase record by ID, scoped to a company (multi-tenant safety).
   *
   * @param id - Record ID
   * @param companyId - Company ID (requerido — evita leaks cross-empresa)
   * @returns Purchase invoice or null if not found
   */
  async getById(id: number, companyId: number): Promise<PurchaseInvoice | null> {
    const records = await this.db.select<Record<string, unknown>>(
      `SELECT * FROM purchase_records WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );

    if (records.length === 0) {
      return null;
    }

    return this.mapRecordToInvoice(records[0]);
  }

  /**
   * ===== UPDATE OPERATIONS =====
   */

  /**
   * Updates a single field in a purchase record
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
    const formattedValue = this.formatValueByType(value, fieldName);

    // Execute UPDATE
    const result = await this.db.execute(
      `UPDATE purchase_records
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
   * Updates multiple fields in a purchase record with a SINGLE query
   *
   * This is the OPTIMIZED method for updating multiple related fields at once.
   * See SalesRepository.updateFields() for detailed documentation.
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param recordId - Database ID of the record
   * @param fields - Object with field names and their new values
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
    const values = fieldNames.map((field) => this.formatValueByType(fields[field], field));

    // Execute single UPDATE with multiple SET clauses
    const result = await this.db.execute(
      `UPDATE purchase_records
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
   * Updates an entire purchase record
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
    invoice: Partial<PurchaseInvoice>
  ): Promise<PurchaseInvoice> {
    // Build update map by intersecting provided fields with the allowed-fields whitelist.
    // This filters out system fields (id, createdAt, updatedAt) and any unknown keys,
    // and covers SUNAT fields, calculated fields, and the 39 freeUseFieldN columns.
    const fields: Record<string, string | number | null> = {};
    for (const fieldName of PURCHASE_ALLOWED_FIELDS) {
      const value = invoice[fieldName as keyof PurchaseInvoice];
      if (value !== undefined) {
        fields[fieldName] = value as string | number | null;
      }
    }

    await this.updateFields(companyId, periodCode, recordId, fields);

    // Return updated record
    const updated = await this.getById(recordId, companyId);
    if (!updated) {
      throw new Error('Failed to retrieve updated record');
    }

    return updated;
  }

  /**
   * ===== DELETE OPERATIONS =====
   */

  /**
   * Deletes a single purchase record
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param recordId - Database ID of the record to delete
   */
  async delete(companyId: number, periodCode: string, recordId: number): Promise<void> {
    await this.db.transaction(async () => {
      const result = await this.db.execute(
        `DELETE FROM purchase_records WHERE id = ? AND company_id = ? AND period = ?`,
        [recordId, companyId, periodCode]
      );

      if (result.rowsAffected === 0) {
        throw new Error('Registro no encontrado o sin permisos para eliminarlo');
      }

      await this.refreshPeriodMetadata(companyId, periodCode);
    });

    this.invalidateCache(companyId, periodCode);
  }

  /**
   * Deletes all purchase records for a period
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   */
  async deleteByPeriod(companyId: number, periodCode: string): Promise<void> {
    // DELETE + metadata update deben ser atómicos (ver sales.repository.deleteByPeriod).
    await this.db.transaction(async () => {
      await this.db.execute(`DELETE FROM purchase_records WHERE company_id = ? AND period = ?`, [
        companyId,
        periodCode
      ]);
      await this.periodRepo.update(companyId, periodCode, 'purchases', 0, 0);
    });

    this.invalidateCache(companyId, periodCode);
  }

  /**
   * ===== PRIVATE HELPER METHODS =====
   */

  /**
   * Maps database row to PurchaseInvoice entity
   */
  private mapRecordToInvoice = (row: Record<string, unknown>): PurchaseInvoice => {
    return {
      id: row.id as number,
      ruc: row.ruc as string | null,
      businessName: row.business_name as string | null,
      period: row.period as string | null,
      sunatCorrelative: row.sunat_correlative as string | null,
      issueDate: row.issue_date as string | null,
      dueDate: row.due_date as string | null,
      voucherType: row.voucher_type as string | null,
      voucherSeries: row.voucher_series as string | null,
      customsYear: row.customs_year as string | null,
      voucherNumberStart: row.voucher_number_start as string | null,
      voucherNumberEnd: row.voucher_number_end as string | null,
      supplierDocType: row.supplier_doc_type as string | null,
      supplierDocNumber: row.supplier_doc_number as string | null,
      supplierName: row.supplier_name as string | null,
      taxableBaseTaxed: row.taxable_base_taxed !== null ? parseFloat(row.taxable_base_taxed as string) : null,
      vatAmountTaxed: row.vat_amount_taxed !== null ? parseFloat(row.vat_amount_taxed as string) : null,
      taxableBaseMixed: row.taxable_base_mixed !== null ? parseFloat(row.taxable_base_mixed as string) : null,
      vatAmountMixed: row.vat_amount_mixed !== null ? parseFloat(row.vat_amount_mixed as string) : null,
      taxableBaseUntaxed: row.taxable_base_untaxed !== null ? parseFloat(row.taxable_base_untaxed as string) : null,
      vatAmountUntaxed: row.vat_amount_untaxed !== null ? parseFloat(row.vat_amount_untaxed as string) : null,
      nonTaxableValue: row.non_taxable_value !== null ? parseFloat(row.non_taxable_value as string) : null,
      selectiveConsumptionTax:
        row.selective_consumption_tax !== null ? parseFloat(row.selective_consumption_tax as string) : null,
      plasticBagTax: row.plastic_bag_tax !== null ? parseFloat(row.plastic_bag_tax as string) : null,
      otherTaxes: row.other_taxes !== null ? parseFloat(row.other_taxes as string) : null,
      totalAmount: row.total_amount !== null ? parseFloat(row.total_amount as string) : null,
      currency: row.currency as string | null,
      exchangeRate: row.exchange_rate !== null ? parseFloat(row.exchange_rate as string) : null,
      modifiedVoucherDate: row.modified_voucher_date as string | null,
      modifiedVoucherType: row.modified_voucher_type as string | null,
      modifiedVoucherSeries: row.modified_voucher_series as string | null,
      damCode: row.dam_code as string | null,
      modifiedVoucherNumber: row.modified_voucher_number as string | null,
      goodsServicesClass: row.goods_services_class as string | null,
      operatorsProjectId: row.operators_project_id as string | null,
      participationPercentage:
        row.participation_percentage !== null ? parseFloat(row.participation_percentage as string) : null,
      municipalBingoTax: row.municipal_bingo_tax as string | null,
      carExportImportIndicator: row.car_export_import_indicator as string | null,
      detraction: row.detraction as string | null,
      noteType: row.note_type as string | null,
      voucherStatus: row.voucher_status as string | null,
      inconsistencyIndicator: row.inconsistency_indicator as string | null,
      // CLU fields
      freeUseField1: row.free_use_field1 as string | null,
      freeUseField2: row.free_use_field2 as string | null,
      freeUseField3: row.free_use_field3 as string | null,
      freeUseField4: row.free_use_field4 as string | null,
      freeUseField5: row.free_use_field5 as string | null,
      freeUseField6: row.free_use_field6 as string | null,
      freeUseField7: row.free_use_field7 as string | null,
      freeUseField8: row.free_use_field8 as string | null,
      freeUseField9: row.free_use_field9 as string | null,
      freeUseField10: row.free_use_field10 as string | null,
      freeUseField11: row.free_use_field11 as string | null,
      freeUseField12: row.free_use_field12 as string | null,
      freeUseField13: row.free_use_field13 as string | null,
      freeUseField14: row.free_use_field14 as string | null,
      freeUseField15: row.free_use_field15 as string | null,
      freeUseField16: row.free_use_field16 as string | null,
      freeUseField17: row.free_use_field17 as string | null,
      freeUseField18: row.free_use_field18 as string | null,
      freeUseField19: row.free_use_field19 as string | null,
      freeUseField20: row.free_use_field20 as string | null,
      freeUseField21: row.free_use_field21 as string | null,
      freeUseField22: row.free_use_field22 as string | null,
      freeUseField23: row.free_use_field23 as string | null,
      freeUseField24: row.free_use_field24 as string | null,
      freeUseField25: row.free_use_field25 as string | null,
      freeUseField26: row.free_use_field26 as string | null,
      freeUseField27: row.free_use_field27 as string | null,
      freeUseField28: row.free_use_field28 as string | null,
      freeUseField29: row.free_use_field29 as string | null,
      freeUseField30: row.free_use_field30 as string | null,
      freeUseField31: row.free_use_field31 as string | null,
      freeUseField32: row.free_use_field32 as string | null,
      freeUseField33: row.free_use_field33 as string | null,
      freeUseField34: row.free_use_field34 as string | null,
      freeUseField35: row.free_use_field35 as string | null,
      freeUseField36: row.free_use_field36 as string | null,
      freeUseField37: row.free_use_field37 as string | null,
      freeUseField38: row.free_use_field38 as string | null,
      freeUseField39: row.free_use_field39 as string | null,
      vatPercentage: row.vat_percentage !== null ? parseFloat(row.vat_percentage as string) : null,
      createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date()
    } as PurchaseInvoice;
  };

  /**
   * Validates if a field name is allowed for updates
   * Automatically derived from PURCHASE_ALLOWED_FIELDS (SUNAT fields + calculated fields)
   * Excludes system fields: id, createdAt, updatedAt
   */
  private isAllowedField(fieldName: string): boolean {
    return (PURCHASE_ALLOWED_FIELDS as readonly string[]).includes(fieldName);
  }

  /**
   * Formats value based on type. Para campos numéricos, respeta `exportDecimals`
   * del field-registry (Tipo de Cambio = 3, importes = 2).
   */
  private formatValueByType(value: string | number | null | undefined, fieldName?: string): string | number | null {
    if (typeof value === 'number') {
      const mapping = fieldName ? PURCHASE_SUNAT_COLUMNS_MAPPING.find((m) => m.tsField === fieldName) : undefined;
      const decimals = mapping?.exportDecimals ?? 2;
      return value.toFixed(decimals);
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
   * Invalidates cache for purchase records
   */
  private invalidateCache(companyId: number, periodCode: string): void {
    const year = parseInt(periodCode.substring(0, 4));
    queryCache.invalidatePurchases(companyId);
    queryCache.invalidatePeriod(companyId, periodCode);
    queryCache.invalidateYear(companyId, year);
  }
}
