import { DatabaseService } from '../database/database.service';
import { cachedQuery, getCacheKey } from '@/shared/lib/cache/query-cache';
import type { InvoiceType } from '@/shared/types/invoice.types';
import type {
  AnalyticsRepository as IAnalyticsRepository,
  PeriodSummary,
  PeriodComparison,
  YearlySummary,
  DashboardMetrics,
  TopEntity,
  DocumentDistribution,
  TaxSummary
} from '@/core/domain/repositories/analytics.repository';

export class AnalyticsRepository implements IAnalyticsRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async getPeriodSummary(companyId: number, periodCode: string, type: InvoiceType): Promise<PeriodSummary | null> {
    if (type !== 'sales' && type !== 'purchases') {
      throw new Error(`Invalid invoice type: ${type}. Must be 'sales' or 'purchases'.`);
    }

    const tableName = type === 'sales' ? 'sales_records' : 'purchase_records';
    const dateField = 'issue_date';

    const baseImponibleField =
      type === 'sales'
        ? 'taxable_base'
        : `COALESCE(taxable_base_taxed, 0) +
         COALESCE(taxable_base_mixed, 0) +
         COALESCE(taxable_base_untaxed, 0)`;

    const vatField =
      type === 'sales'
        ? 'vat_amount'
        : `COALESCE(vat_amount_taxed, 0) +
         COALESCE(vat_amount_mixed, 0) +
         COALESCE(vat_amount_untaxed, 0)`;

    const query = `
      SELECT
        period as periodCode,
        CAST(substr(period, 1, 4) AS INTEGER) as year,
        CAST(substr(period, 5, 2) AS INTEGER) as month,
        COUNT(*) as recordCount,
        COALESCE(SUM(total_amount), 0) as totalAmount,
        COALESCE(SUM(${baseImponibleField}), 0) as taxableBaseTotal,
        COALESCE(SUM(${vatField}), 0) as vatTotal,
        COALESCE(AVG(total_amount), 0) as avgTransaction,
        COALESCE(MAX(total_amount), 0) as maxTransaction,
        MIN(${dateField}) as firstTransaction,
        MAX(${dateField}) as lastTransaction
      FROM ${tableName}
      WHERE company_id = ? AND period = ?
      GROUP BY period
    `;

    const results = await this.db.select<PeriodSummary>(query, [companyId, periodCode]);
    return results.length > 0 ? results[0] : null;
  }

  async getSalesPeriodSummary(companyId: number, periodCode: string): Promise<PeriodSummary | null> {
    const cacheKey = getCacheKey('sales_period_summary', { companyId, periodCode });
    return cachedQuery(cacheKey, () => this.getPeriodSummary(companyId, periodCode, 'sales'));
  }

  async getPurchasesPeriodSummary(companyId: number, periodCode: string): Promise<PeriodSummary | null> {
    const cacheKey = getCacheKey('purchases_period_summary', { companyId, periodCode });
    return cachedQuery(cacheKey, () => this.getPeriodSummary(companyId, periodCode, 'purchases'));
  }

  async getPeriodComparison(
    companyId: number,
    periodCode: string,
    type: InvoiceType
  ): Promise<PeriodComparison | null> {
    const query = `
      WITH period_data AS (
        SELECT
          period,
          SUM(total_amount) as total_amount
        FROM ${type}_records
        WHERE company_id = ?
        GROUP BY period
      ),
      with_lag AS (
        SELECT
          period,
          total_amount,
          LAG(total_amount, 1) OVER (ORDER BY period) as prev_1_month,
          LAG(total_amount, 3) OVER (ORDER BY period) as prev_3_months,
          LAG(total_amount, 6) OVER (ORDER BY period) as prev_6_months,
          LAG(total_amount, 12) OVER (ORDER BY period) as prev_12_months
        FROM period_data
      )
      SELECT
        period as periodCode,
        '${type}' as type,
        total_amount as totalAmount,
        prev_1_month as prev1Month,
        prev_3_months as prev3Months,
        prev_6_months as prev6Months,
        prev_12_months as prev12Months,
        CASE
          WHEN prev_1_month IS NOT NULL AND prev_1_month != 0
          THEN ROUND(((total_amount - prev_1_month) / prev_1_month * 100), 2)
          ELSE NULL
        END as delta1Month,
        CASE
          WHEN prev_3_months IS NOT NULL AND prev_3_months != 0
          THEN ROUND(((total_amount - prev_3_months) / prev_3_months * 100), 2)
          ELSE NULL
        END as delta3Months,
        CASE
          WHEN prev_6_months IS NOT NULL AND prev_6_months != 0
          THEN ROUND(((total_amount - prev_6_months) / prev_6_months * 100), 2)
          ELSE NULL
        END as delta6Months,
        CASE
          WHEN prev_12_months IS NOT NULL AND prev_12_months != 0
          THEN ROUND(((total_amount - prev_12_months) / prev_12_months * 100), 2)
          ELSE NULL
        END as delta12Months
      FROM with_lag
      WHERE period = ?
    `;

    const results = await this.db.select<PeriodComparison>(query, [companyId, periodCode]);
    return results.length > 0 ? results[0] : null;
  }

  async getYearlySummary(companyId: number, year: number): Promise<YearlySummary | null> {
    const cacheKey = getCacheKey('yearly_summary', { companyId, year });
    return cachedQuery(cacheKey, () => this.getYearlySummaryUncached(companyId, year));
  }

  private async getYearlySummaryUncached(companyId: number, year: number): Promise<YearlySummary | null> {
    const query = `
      WITH yearly_sales AS (
        SELECT
          year,
          COALESCE(SUM(total_amount), 0) as sales_total,
          COALESCE(SUM(taxable_base), 0) as sales_taxable_base,
          COALESCE(SUM(vat_amount), 0) as sales_vat,
          COUNT(DISTINCT period) as sales_months
        FROM sales_records
        WHERE company_id = ? AND year = ?
        GROUP BY year
      ),
      yearly_purchases AS (
        SELECT
          year,
          COALESCE(SUM(total_amount), 0) as purchases_total,
          COALESCE(SUM(
            COALESCE(taxable_base_taxed, 0) +
            COALESCE(taxable_base_mixed, 0) +
            COALESCE(taxable_base_untaxed, 0)
          ), 0) as purchases_taxable_base,
          COALESCE(SUM(
            COALESCE(vat_amount_taxed, 0) +
            COALESCE(vat_amount_mixed, 0) +
            COALESCE(vat_amount_untaxed, 0)
          ), 0) as purchases_vat,
          COUNT(DISTINCT period) as purchases_months
        FROM purchase_records
        WHERE company_id = ? AND year = ?
        GROUP BY year
      )
      SELECT
        COALESCE(s.year, p.year, ?) as year,
        COALESCE(s.sales_total, 0) as salesTotal,
        COALESCE(s.sales_taxable_base, 0) as salesTaxableBase,
        COALESCE(s.sales_vat, 0) as salesVat,
        COALESCE(s.sales_months, 0) as salesMonths,
        COALESCE(p.purchases_total, 0) as purchasesTotal,
        COALESCE(p.purchases_taxable_base, 0) as purchasesTaxableBase,
        COALESCE(p.purchases_vat, 0) as purchasesVat,
        COALESCE(p.purchases_months, 0) as purchasesMonths,
        COALESCE(s.sales_total, 0) - COALESCE(p.purchases_total, 0) as netTotal
      FROM yearly_sales s
      FULL OUTER JOIN yearly_purchases p ON s.year = p.year
    `;

    const results = await this.db.select<YearlySummary>(query, [companyId, year, companyId, year, year]);
    return results.length > 0 ? results[0] : null;
  }

  async getMonthlyTrend(companyId: number, year: number, type: InvoiceType): Promise<PeriodSummary[]> {
    const baseQuery =
      type === 'sales'
        ? `
          SELECT
            period as periodCode,
            CAST(substr(period, 1, 4) AS INTEGER) as year,
            CAST(substr(period, 5, 2) AS INTEGER) as month,
            COUNT(*) as recordCount,
            COALESCE(SUM(total_amount), 0) as totalAmount,
            COALESCE(SUM(taxable_base), 0) as taxableBaseTotal,
            COALESCE(SUM(vat_amount), 0) as vatTotal,
            COALESCE(AVG(total_amount), 0) as avgTransaction,
            COALESCE(MAX(total_amount), 0) as maxTransaction,
            MIN(issue_date) as firstTransaction,
            MAX(issue_date) as lastTransaction
          FROM sales_records
          WHERE company_id = ? AND CAST(substr(period, 1, 4) AS INTEGER) = ?
          GROUP BY period
          ORDER BY period
        `
        : `
          SELECT
            period as periodCode,
            CAST(substr(period, 1, 4) AS INTEGER) as year,
            CAST(substr(period, 5, 2) AS INTEGER) as month,
            COUNT(*) as recordCount,
            COALESCE(SUM(total_amount), 0) as totalAmount,
            COALESCE(SUM(
              COALESCE(taxable_base_taxed, 0) +
              COALESCE(taxable_base_mixed, 0) +
              COALESCE(taxable_base_untaxed, 0)
            ), 0) as taxableBaseTotal,
            COALESCE(SUM(
              COALESCE(vat_amount_taxed, 0) +
              COALESCE(vat_amount_mixed, 0) +
              COALESCE(vat_amount_untaxed, 0)
            ), 0) as vatTotal,
            COALESCE(AVG(total_amount), 0) as avgTransaction,
            COALESCE(MAX(total_amount), 0) as maxTransaction,
            MIN(issue_date) as firstTransaction,
            MAX(issue_date) as lastTransaction
          FROM purchase_records
          WHERE company_id = ? AND CAST(substr(period, 1, 4) AS INTEGER) = ?
          GROUP BY period
          ORDER BY period
        `;

    return await this.db.select<PeriodSummary>(baseQuery, [companyId, year]);
  }

  async getDashboardMetrics(companyId: number, periodCode: string, type: InvoiceType): Promise<DashboardMetrics> {
    const year = parseInt(periodCode.substring(0, 4));
    const month = parseInt(periodCode.substring(4, 6));

    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const previousPeriodCode = `${prevYear}${prevMonth.toString().padStart(2, '0')}`;

    const [currentPeriod, previousPeriod, yearToDate, monthlyTrend, periodComparison] = await Promise.all([
      type === 'sales'
        ? this.getSalesPeriodSummary(companyId, periodCode)
        : this.getPurchasesPeriodSummary(companyId, periodCode),
      type === 'sales'
        ? this.getSalesPeriodSummary(companyId, previousPeriodCode)
        : this.getPurchasesPeriodSummary(companyId, previousPeriodCode),
      this.getYearlySummary(companyId, year),
      this.getMonthlyTrend(companyId, year, type),
      this.getPeriodComparison(companyId, periodCode, type)
    ]);

    return {
      currentPeriod,
      previousPeriod,
      yearToDate,
      monthlyTrend,
      periodComparison
    };
  }

  async getTopClients(companyId: number, periodCode: string, limit: number = 10): Promise<TopEntity[]> {
    const query = `
      SELECT
        customer_doc_number as documentNumber,
        customer_name as name,
        COUNT(*) as transactionCount,
        SUM(total_amount) as totalAmount,
        AVG(total_amount) as avgAmount
      FROM sales_records
      WHERE company_id = ? AND period = ?
        AND customer_doc_number IS NOT NULL
        AND customer_name IS NOT NULL
      GROUP BY customer_doc_number, customer_name
      ORDER BY totalAmount DESC
      LIMIT ?
    `;

    return await this.db.select<TopEntity>(query, [companyId, periodCode, limit]);
  }

  async getTopSuppliers(companyId: number, periodCode: string, limit: number = 10): Promise<TopEntity[]> {
    const query = `
      SELECT
        supplier_doc_number as documentNumber,
        supplier_name as name,
        COUNT(*) as transactionCount,
        SUM(total_amount) as totalAmount,
        AVG(total_amount) as avgAmount
      FROM purchase_records
      WHERE company_id = ? AND period = ?
        AND supplier_doc_number IS NOT NULL
        AND supplier_name IS NOT NULL
      GROUP BY supplier_doc_number, supplier_name
      ORDER BY totalAmount DESC
      LIMIT ?
    `;

    return await this.db.select<TopEntity>(query, [companyId, periodCode, limit]);
  }

  async getDocumentDistribution(
    companyId: number,
    periodCode: string,
    type: InvoiceType
  ): Promise<DocumentDistribution[]> {
    if (type !== 'sales' && type !== 'purchases') {
      throw new Error(`Invalid invoice type: ${type}. Must be 'sales' or 'purchases'.`);
    }

    const tableName = type === 'sales' ? 'sales_records' : 'purchase_records';

    const query = `
      SELECT
        voucher_type as documentType,
        COUNT(*) as count,
        SUM(total_amount) as totalAmount,
        ROUND(
          SUM(total_amount) * 100.0 / (
            SELECT SUM(total_amount) FROM ${tableName}
            WHERE company_id = ? AND period = ?
          ), 2
        ) as percentage
      FROM ${tableName}
      WHERE company_id = ? AND period = ?
        AND voucher_type IS NOT NULL
      GROUP BY voucher_type
      ORDER BY totalAmount DESC
    `;

    return await this.db.select<DocumentDistribution>(query, [companyId, periodCode, companyId, periodCode]);
  }

  async getTaxSummary(companyId: number, periodCode: string, type: InvoiceType): Promise<TaxSummary | null> {
    if (type !== 'sales' && type !== 'purchases') {
      throw new Error(`Invalid invoice type: ${type}. Must be 'sales' or 'purchases'.`);
    }

    const query =
      type === 'sales'
        ? `
          SELECT
            SUM(taxable_base) as taxableBase,
            SUM(vat_amount) as vatTotal,
            SUM(exempt_amount) as exemptTotal,
            SUM(unaffected_amount) as unaffectedTotal,
            SUM(export_value) as exportTotal,
            SUM(total_amount) as grandTotal,
            COUNT(*) as recordCount
          FROM sales_records
          WHERE company_id = ? AND period = ?
        `
        : `
          SELECT
            SUM(
              COALESCE(taxable_base_taxed, 0) +
              COALESCE(taxable_base_mixed, 0) +
              COALESCE(taxable_base_untaxed, 0)
            ) as taxableBase,
            SUM(
              COALESCE(vat_amount_taxed, 0) +
              COALESCE(vat_amount_mixed, 0) +
              COALESCE(vat_amount_untaxed, 0)
            ) as vatTotal,
            SUM(non_taxable_value) as nonTaxableTotal,
            SUM(total_amount) as grandTotal,
            COUNT(*) as recordCount
          FROM purchase_records
          WHERE company_id = ? AND period = ?
        `;

    const results = await this.db.select<TaxSummary>(query, [companyId, periodCode]);
    return results.length > 0 ? results[0] : null;
  }
}
