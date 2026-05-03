import { BUSINESS } from '@/shared/constants/validation.constants';
import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Period Entity
 * Represents a tax period (periodo tributario)
 */
export interface Period {
  id: number;
  companyId: number;
  code: string; // Format: YYYYMM (e.g., "202510")
  type: InvoiceType;
  hasData: boolean;
  recordCount: number;
  totalAmount: number;
  lastModified: Date | null;
  declared: boolean; // Whether this period has been declared to SUNAT
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Period creation DTO
 */
export interface CreatePeriodDto {
  companyId: number;
  code: string;
  type: InvoiceType;
}

/**
 * Available period with metadata
 */
export interface AvailablePeriod {
  code: string;
  label: string; // e.g., "Octubre 2025"
  year: number;
  month: number;
  hasData: boolean;
  declared?: boolean;
  recordCount?: number;
  lastModified?: Date;
}

/**
 * Period utilities
 */
export class PeriodUtils {
  private static readonly MONTHS = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ];

  /**
   * Generates list of available periods from business start date to previous month
   * Only shows periods up to the last closed month (previous month)
   * Example: If today is November 2025, last available period is October 2025
   */
  static getAvailablePeriods(): Omit<AvailablePeriod, 'hasData' | 'recordCount' | 'lastModified'>[] {
    const periods: Omit<AvailablePeriod, 'hasData' | 'recordCount' | 'lastModified'>[] = [];

    // Start from business start date (Agosto 2024)
    const startDate = new Date(BUSINESS.START_YEAR, BUSINESS.START_MONTH - 1, 1);

    // End at previous month (last closed period)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() - 1); // Previous month

    const current = new Date(startDate);
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const code = `${year}${String(month + 1).padStart(2, '0')}`;
      const label = `${this.MONTHS[month]} ${year}`;

      periods.push({
        code,
        label,
        year,
        month: month + 1
      });

      current.setMonth(current.getMonth() + 1);
    }

    return periods.reverse(); // Most recent first
  }

  /**
   * Formats period code to human readable label
   */
  static formatPeriodLabel(code: string): string {
    if (!/^\d{6}$/.test(code)) {
      return code;
    }

    const year = code.substring(0, 4);
    const month = parseInt(code.substring(4, 6)) - 1;

    if (month < 0 || month > 11) {
      return code;
    }

    return `${this.MONTHS[month]} ${year}`;
  }

  /**
   * Gets current period code
   */
  static getCurrentPeriodCode(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }

  /**
   * Gets current period code (alias for getCurrentPeriodCode)
   * @deprecated Use getLastValidPeriod() instead for tax declarations
   */
  static getCurrentPeriod(): string {
    return this.getCurrentPeriodCode();
  }

  /**
   * Gets the last valid period for tax declarations (previous month)
   * This is the most recent period that can be declared to SUNAT
   * Example: If today is November 2025, returns "202510" (October 2025)
   */
  static getLastValidPeriod(): string {
    const now = new Date();
    // Go back one month
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }

  /**
   * Validates period code format
   */
  static isValidPeriodCode(code: string): boolean {
    if (!/^\d{6}$/.test(code)) {
      return false;
    }

    const year = parseInt(code.substring(0, 4));
    const month = parseInt(code.substring(4, 6));

    // Validate year is from business start year onwards
    return year >= BUSINESS.START_YEAR && year <= 2050 && month >= 1 && month <= 12;
  }
}
