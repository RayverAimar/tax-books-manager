import type {
  CompanyRepository,
  SalesRepository,
  PurchasesRepository,
  AnalyticsRepository,
  PeriodRepository,
  SettingsRepository,
  ExportHistoryRepository
} from '@/core/domain/repositories';

import { CompanyRepository as CompanyRepositoryImpl } from './company.repository';
import { SalesRepository as SalesRepositoryImpl } from './sales.repository';
import { PurchasesRepository as PurchasesRepositoryImpl } from './purchases.repository';
import { AnalyticsRepository as AnalyticsRepositoryImpl } from './analytics.repository';
import { PeriodRepository as PeriodRepositoryImpl } from './period.repository';
import { SettingsRepository as SettingsRepositoryImpl } from './settings.repository';
import { ExportHistoryRepository as ExportHistoryRepositoryImpl } from './export-history.repository';

/**
 * Repository mode type
 */
export type RepositoryMode = 'local' | 'api';

/**
 * Repository Factory
 *
 * Centralized factory for creating repository instances using the singleton pattern.
 * Provides caching to avoid creating multiple instances of the same repository.
 *
 * Usage:
 * ```typescript
 * // In main.tsx
 * RepositoryFactory.setMode('local');
 *
 * // In components/hooks
 * const companyRepo = RepositoryFactory.getCompanyRepository();
 * const salesRepo = RepositoryFactory.getSalesRepository();
 * ```
 */
export class RepositoryFactory {
  private static mode: RepositoryMode = 'local';
  private static apiBaseUrl: string | null = null;

  // Singleton instances (cached)
  private static companyRepoInstance: CompanyRepository | null = null;
  private static salesRepoInstance: SalesRepository | null = null;
  private static purchasesRepoInstance: PurchasesRepository | null = null;
  private static analyticsRepoInstance: AnalyticsRepository | null = null;
  private static periodRepoInstance: PeriodRepository | null = null;
  private static settingsRepoInstance: SettingsRepository | null = null;
  private static exportHistoryRepoInstance: ExportHistoryRepository | null = null;

  /**
   * Set the repository mode
   *
   * @param mode - Repository mode ('local' or 'api')
   * @param apiBaseUrl - Base URL for API mode (required if mode is 'api')
   */
  static setMode(mode: RepositoryMode, apiBaseUrl?: string): void {
    this.mode = mode;

    if (mode === 'api') {
      if (!apiBaseUrl) {
        throw new Error('API base URL is required when mode is "api"');
      }
      this.apiBaseUrl = apiBaseUrl;
    }

    // Clear cached instances when mode changes
    this.clearCache();
  }

  /**
   * Get the current repository mode
   */
  static getMode(): RepositoryMode {
    return this.mode;
  }

  /**
   * Clear all cached repository instances
   * Forces new instances to be created on next access
   */
  static clearCache(): void {
    this.companyRepoInstance = null;
    this.salesRepoInstance = null;
    this.purchasesRepoInstance = null;
    this.analyticsRepoInstance = null;
    this.periodRepoInstance = null;
    this.settingsRepoInstance = null;
    this.exportHistoryRepoInstance = null;
  }

  /**
   * Get Company Repository instance
   *
   * @returns CompanyRepository singleton instance
   */
  static getCompanyRepository(): CompanyRepository {
    if (this.companyRepoInstance) {
      return this.companyRepoInstance;
    }

    if (this.mode === 'api') {
      throw new Error('API mode not implemented');
    }

    this.companyRepoInstance = new CompanyRepositoryImpl();
    return this.companyRepoInstance;
  }

  /**
   * Get Sales Repository instance
   *
   * @returns SalesRepository singleton instance
   */
  static getSalesRepository(): SalesRepository {
    if (this.salesRepoInstance) {
      return this.salesRepoInstance;
    }

    if (this.mode === 'api') {
      throw new Error('API mode not implemented');
    }

    this.salesRepoInstance = new SalesRepositoryImpl();
    return this.salesRepoInstance;
  }

  /**
   * Get Purchases Repository instance
   *
   * @returns PurchasesRepository singleton instance
   */
  static getPurchasesRepository(): PurchasesRepository {
    if (this.purchasesRepoInstance) {
      return this.purchasesRepoInstance;
    }

    if (this.mode === 'api') {
      throw new Error('API mode not implemented');
    }

    this.purchasesRepoInstance = new PurchasesRepositoryImpl();
    return this.purchasesRepoInstance;
  }

  /**
   * Get Analytics Repository instance
   *
   * @returns AnalyticsRepository singleton instance
   */
  static getAnalyticsRepository(): AnalyticsRepository {
    if (this.analyticsRepoInstance) {
      return this.analyticsRepoInstance;
    }

    if (this.mode === 'api') {
      throw new Error('API mode not implemented');
    }

    this.analyticsRepoInstance = new AnalyticsRepositoryImpl();
    return this.analyticsRepoInstance;
  }

  /**
   * Get Period Repository instance
   *
   * @returns PeriodRepository singleton instance
   */
  static getPeriodRepository(): PeriodRepository {
    if (this.periodRepoInstance) {
      return this.periodRepoInstance;
    }

    if (this.mode === 'api') {
      throw new Error('API mode not implemented');
    }

    this.periodRepoInstance = new PeriodRepositoryImpl();
    return this.periodRepoInstance;
  }

  /**
   * Get Settings Repository instance
   *
   * @returns SettingsRepository singleton instance
   */
  static getSettingsRepository(): SettingsRepository {
    if (this.settingsRepoInstance) {
      return this.settingsRepoInstance;
    }

    if (this.mode === 'api') {
      throw new Error('API mode not implemented');
    }

    this.settingsRepoInstance = new SettingsRepositoryImpl();
    return this.settingsRepoInstance;
  }

  /**
   * Get Export History Repository instance
   */
  static getExportHistoryRepository(): ExportHistoryRepository {
    if (this.exportHistoryRepoInstance) {
      return this.exportHistoryRepoInstance;
    }
    if (this.mode === 'api') {
      throw new Error('API mode not implemented');
    }
    this.exportHistoryRepoInstance = new ExportHistoryRepositoryImpl();
    return this.exportHistoryRepoInstance;
  }
}
