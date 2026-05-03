/**
 * Repository Contracts
 *
 * This module exports all repository contracts for the application.
 * These contracts define the interface that implementations must follow,
 * making it easy to switch between different data sources (SQLite, REST API, etc.)
 */

// Company repository
export type { CompanyRepository } from './company.repository';

// Invoice repositories (Sales & Purchases)
export type {
  InvoiceRepository,
  SalesRepository,
  PurchasesRepository
} from './invoice.repository';

// Analytics repository
export type {
  AnalyticsRepository,
  PeriodSummary,
  PeriodComparison,
  YearlySummary,
  DashboardMetrics,
  TopEntity,
  DocumentDistribution,
  TaxSummary
} from './analytics.repository';

// Period repository
export type { PeriodRepository } from './period.repository';

// Settings repository
export type { SettingsRepository } from './settings.repository';
