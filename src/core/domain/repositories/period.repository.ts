/**
 * Period Repository Contract
 *
 * Defines the interface for period metadata operations.
 * Manages period records (NOT invoice data - only metadata).
 */

import type { Period, CreatePeriodDto, AvailablePeriod } from '../entities/period.entity';

export interface PeriodRepository {
  /**
   * Gets all available periods with their data status
   *
   * Combines predefined available periods with actual data status from the database.
   *
   * @param companyId - Company ID
   * @param type - Invoice type ('sales' or 'purchases')
   * @returns Array of available periods with data status
   */
  getAvailablePeriods(companyId: number, type: 'sales' | 'purchases'): Promise<AvailablePeriod[]>;

  /**
   * Gets or creates a period
   *
   * If the period already exists in the database, returns it.
   * Otherwise, creates a new period record.
   *
   * @param dto - Period creation data
   * @returns Period entity
   */
  getOrCreatePeriod(dto: CreatePeriodDto): Promise<Period>;

  /**
   * Finds a period by ID
   *
   * @param id - Period ID
   * @returns Period entity
   * @throws Error if period not found
   */
  getById(id: number): Promise<Period>;

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
  update(
    companyId: number,
    periodCode: string,
    type: 'sales' | 'purchases',
    recordCount: number,
    totalAmount: number
  ): Promise<void>;

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
  setDeclared(companyId: number, periodCode: string, type: 'sales' | 'purchases', declared: boolean): Promise<void>;
}
