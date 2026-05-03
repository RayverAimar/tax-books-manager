/**
 * Analytics Repository Contract
 *
 * Defines the interface for analytics and reporting operations.
 */

import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Period summary data
 */
export interface PeriodSummary {
  periodCode: string;
  year: number;
  month: number;
  recordCount: number;
  totalAmount: number;
  taxableBaseTotal: number;
  vatTotal: number;
  avgTransaction: number;
  maxTransaction: number;
  firstTransaction?: Date;
  lastTransaction?: Date;
}

/**
 * Period comparison with historical data
 */
export interface PeriodComparison {
  periodCode: string;
  type: InvoiceType;
  totalAmount: number;
  delta1Month?: number;
  delta3Months?: number;
  delta6Months?: number;
  delta12Months?: number;
  prev1Month?: number;
  prev3Months?: number;
  prev6Months?: number;
  prev12Months?: number;
}

/**
 * Yearly summary (combines sales and purchases)
 */
export interface YearlySummary {
  year: number;
  salesTotal: number;
  salesTaxableBase: number;
  salesVat: number;
  salesMonths: number;
  purchasesTotal: number;
  purchasesTaxableBase: number;
  purchasesVat: number;
  purchasesMonths: number;
  netTotal: number;
}

/**
 * Complete dashboard metrics
 */
export interface DashboardMetrics {
  currentPeriod: PeriodSummary | null;
  previousPeriod: PeriodSummary | null;
  yearToDate: YearlySummary | null;
  monthlyTrend: PeriodSummary[];
  periodComparison: PeriodComparison | null;
}

/**
 * Top entity (client/supplier)
 */
export interface TopEntity {
  documentNumber: string;
  name: string;
  transactionCount: number;
  totalAmount: number;
  avgAmount: number;
}

/**
 * Document type distribution
 */
export interface DocumentDistribution {
  documentType: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

/**
 * Tax summary
 */
export interface TaxSummary {
  taxableBase: number;
  vatTotal: number;
  grandTotal: number;
  recordCount: number;
  // Sales-specific
  exemptTotal?: number;
  unaffectedTotal?: number;
  exportTotal?: number;
  // Purchases-specific
  nonTaxableTotal?: number;
}

/**
 * Analytics repository contract
 */
export interface AnalyticsRepository {
  /**
   * Get period summary for sales or purchases
   *
   * @param companyId - Company ID
   * @param periodCode - Period code (YYYYMM)
   * @param type - Invoice type ('sales' or 'purchases')
   * @returns Period summary or null if no data
   */
  getPeriodSummary(
    companyId: number,
    periodCode: string,
    type: InvoiceType
  ): Promise<PeriodSummary | null>;

  /**
   * Get period comparison with historical periods
   *
   * @param companyId - Company ID
   * @param periodCode - Period code
   * @param type - Invoice type
   * @returns Comparison data with deltas
   */
  getPeriodComparison(
    companyId: number,
    periodCode: string,
    type: InvoiceType
  ): Promise<PeriodComparison | null>;

  /**
   * Get yearly summary (sales + purchases)
   *
   * @param companyId - Company ID
   * @param year - Year (e.g., 2024)
   * @returns Yearly summary
   */
  getYearlySummary(companyId: number, year: number): Promise<YearlySummary | null>;

  /**
   * Get monthly trend for a year
   *
   * @param companyId - Company ID
   * @param year - Year
   * @param type - Invoice type
   * @returns Array of monthly summaries
   */
  getMonthlyTrend(
    companyId: number,
    year: number,
    type: InvoiceType
  ): Promise<PeriodSummary[]>;

  /**
   * Get complete dashboard metrics
   *
   * @param companyId - Company ID
   * @param periodCode - Period code
   * @param type - Invoice type
   * @returns Dashboard metrics bundle
   */
  getDashboardMetrics(
    companyId: number,
    periodCode: string,
    type: InvoiceType
  ): Promise<DashboardMetrics>;

  /**
   * Get top clients by sales amount
   *
   * @param companyId - Company ID
   * @param periodCode - Period code
   * @param limit - Number of top clients to return
   * @returns Array of top clients
   */
  getTopClients(companyId: number, periodCode: string, limit?: number): Promise<TopEntity[]>;

  /**
   * Get top suppliers by purchase amount
   *
   * @param companyId - Company ID
   * @param periodCode - Period code
   * @param limit - Number of top suppliers to return
   * @returns Array of top suppliers
   */
  getTopSuppliers(companyId: number, periodCode: string, limit?: number): Promise<TopEntity[]>;

  /**
   * Get document type distribution
   *
   * @param companyId - Company ID
   * @param periodCode - Period code
   * @param type - Invoice type
   * @returns Array of document distributions
   */
  getDocumentDistribution(
    companyId: number,
    periodCode: string,
    type: InvoiceType
  ): Promise<DocumentDistribution[]>;

  /**
   * Get tax summary for a period
   *
   * @param companyId - Company ID
   * @param periodCode - Period code
   * @param type - Invoice type
   * @returns Tax summary
   */
  getTaxSummary(
    companyId: number,
    periodCode: string,
    type: InvoiceType
  ): Promise<TaxSummary | null>;
}
