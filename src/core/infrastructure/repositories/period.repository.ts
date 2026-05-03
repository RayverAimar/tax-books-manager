import { DatabaseService } from '../database/database.service';
import type { Period, CreatePeriodDto, AvailablePeriod } from '@/core/domain/entities/period.entity';
import { PeriodUtils } from '@/core/domain/entities/period.entity';
import type { PeriodRepository as PeriodRepositoryContract } from '@/core/domain/repositories';
import { getCurrentTimestamp } from '@/shared/lib/formatters/date';

/**
 * Period Repository (SQLite Implementation)
 * Handles all database operations for the 'periods' table ONLY
 *
 * Implements the PeriodRepository contract defined in the domain layer.
 * This repository follows the Single Responsibility Principle:
 * it ONLY manages period metadata, NOT invoice records.
 * For invoice operations, use SalesRepository or PurchasesRepository.
 */
export class PeriodRepository implements PeriodRepositoryContract {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Gets all available periods with their data status
   *
   * Combines predefined available periods (from PeriodUtils) with
   * actual data status from the database.
   *
   * @param companyId - Company ID
   * @param type - Invoice type ('sales' or 'purchases')
   * @returns Array of available periods with data status
   */
  async getAvailablePeriods(companyId: number, type: 'sales' | 'purchases'): Promise<AvailablePeriod[]> {
    const availablePeriods = PeriodUtils.getAvailablePeriods();

    // Get periods with data from database
    const periodsWithData = await this.db.select<{
      code: string;
      record_count: number;
      last_modified: string;
      declared: number;
    }>(
      `SELECT code, record_count, last_modified, declared
       FROM periods
       WHERE company_id = ? AND type = ? AND has_data = 1`,
      [companyId, type]
    );

    // Create a map for quick lookup
    const dataMap = new Map(
      periodsWithData.map((p) => [
        p.code,
        {
          recordCount: p.record_count,
          lastModified: p.last_modified ? new Date(p.last_modified) : undefined,
          declared: Boolean(p.declared)
        }
      ])
    );

    // Merge with available periods
    return availablePeriods.map((period) => ({
      ...period,
      hasData: dataMap.has(period.code),
      declared: dataMap.get(period.code)?.declared,
      recordCount: dataMap.get(period.code)?.recordCount,
      lastModified: dataMap.get(period.code)?.lastModified
    }));
  }

  /**
   * Gets or creates a period
   *
   * If the period already exists in the database, returns it.
   * Otherwise, creates a new period record.
   *
   * @param dto - Period creation data
   * @returns Period entity
   */
  async getOrCreatePeriod(dto: CreatePeriodDto): Promise<Period> {
    // Check if period exists
    const existing = await this.db.select<Period>(
      `SELECT * FROM periods
       WHERE company_id = ? AND code = ? AND type = ?`,
      [dto.companyId, dto.code, dto.type]
    );

    if (existing.length > 0) {
      return this.mapToEntity(existing[0] as unknown as Record<string, unknown>);
    }

    // Create new period
    const result = await this.db.execute(
      `INSERT INTO periods (company_id, code, type)
       VALUES (?, ?, ?)`,
      [dto.companyId, dto.code, dto.type]
    );

    return await this.getById(result.lastInsertId as number);
  }

  /**
   * Finds a period by ID
   *
   * @param id - Period ID
   * @returns Period entity
   * @throws Error if period not found
   */
  async getById(id: number): Promise<Period> {
    const results = await this.db.select<Period>(`SELECT * FROM periods WHERE id = ?`, [id]);

    if (results.length === 0) {
      throw new Error('Periodo no encontrado');
    }

    return this.mapToEntity(results[0] as unknown as Record<string, unknown>);
  }

  /**
   * Updates period metadata after invoice operations
   *
   * This method is called by SalesRepository and PurchasesRepository
   * after saving/updating/deleting invoice records to keep the
   * periods table synchronized.
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param type - Invoice type ('sales' or 'purchases')
   * @param recordCount - Number of records in the period
   * @param totalAmount - Total amount of all records
   */
  async update(
    companyId: number,
    periodCode: string,
    type: 'sales' | 'purchases',
    recordCount: number,
    totalAmount: number
  ): Promise<void> {
    const now = getCurrentTimestamp();
    await this.db.execute(
      `INSERT INTO periods (company_id, code, type, has_data, record_count, total_amount, last_modified, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?)
       ON CONFLICT(company_id, code, type)
       DO UPDATE SET
         has_data = 1,
         record_count = excluded.record_count,
         total_amount = excluded.total_amount,
         last_modified = excluded.last_modified,
         updated_at = excluded.updated_at`,
      [companyId, periodCode, type, recordCount, totalAmount.toFixed(2), now, now]
    );
  }

  /**
   * Sets the declared status of a period
   *
   * This marks whether a period has been officially declared to SUNAT.
   * When a period is marked as declared, write operations should prompt a warning.
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param type - Invoice type ('sales' or 'purchases')
   * @param declared - Whether the period is declared
   */
  async setDeclared(
    companyId: number,
    periodCode: string,
    type: 'sales' | 'purchases',
    declared: boolean
  ): Promise<void> {
    const now = getCurrentTimestamp();
    await this.db.execute(
      `UPDATE periods
       SET declared = ?, updated_at = ?
       WHERE company_id = ? AND code = ? AND type = ?`,
      [declared ? 1 : 0, now, companyId, periodCode, type]
    );
  }

  /**
   * Maps database row to Period entity
   *
   * @param row - Database row
   * @returns Period entity
   */
  private mapToEntity(row: Record<string, unknown>): Period {
    return {
      id: row.id as number,
      companyId: row.company_id as number,
      code: row.code as string,
      type: row.type as 'sales' | 'purchases',
      hasData: Boolean(row.has_data),
      recordCount: (row.record_count as number) || 0,
      totalAmount: parseFloat((row.total_amount as string) || '0'),
      lastModified: row.last_modified ? new Date(row.last_modified as string) : null,
      declared: Boolean(row.declared),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  }
}
