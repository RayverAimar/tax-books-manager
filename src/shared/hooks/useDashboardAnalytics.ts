import { useState, useEffect, useCallback } from 'react';
import type {
  DashboardMetrics,
  YearlySummary,
  PeriodSummary,
  PeriodComparison,
  AnalyticsRepository,
  TaxSummary,
  TopEntity,
  DocumentDistribution
} from '@/core/domain/repositories';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import { useCompany } from '@/core/presentation/contexts/company.context';

interface UseDashboardAnalyticsReturn {
  // Current period metrics
  currentMetrics: DashboardMetrics | null;
  yearlyData: YearlySummary | null;

  // Comparisons
  salesComparison: PeriodComparison | null;
  purchasesComparison: PeriodComparison | null;

  // Trends
  salesTrend: PeriodSummary[];
  purchasesTrend: PeriodSummary[];

  // Tax summaries
  salesTaxSummary: TaxSummary | null;
  purchasesTaxSummary: TaxSummary | null;

  // Top entities
  topClients: TopEntity[];
  topSuppliers: TopEntity[];

  // Document distributions
  salesDocumentTypes: DocumentDistribution[];
  purchasesDocumentTypes: DocumentDistribution[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshData: () => Promise<void>;
  loadPeriodData: (periodCode: string) => Promise<void>;
}

export function useDashboardAnalytics(periodCode?: string): UseDashboardAnalyticsReturn {
  const { company: currentCompany } = useCompany();
  const [analyticsRepo] = useState<AnalyticsRepository>(() => RepositoryFactory.getAnalyticsRepository());

  // State
  const [currentMetrics, setCurrentMetrics] = useState<DashboardMetrics | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlySummary | null>(null);
  const [salesComparison, setSalesComparison] = useState<PeriodComparison | null>(null);
  const [purchasesComparison, setPurchasesComparison] = useState<PeriodComparison | null>(null);
  const [salesTrend, setSalesTrend] = useState<PeriodSummary[]>([]);
  const [purchasesTrend, setPurchasesTrend] = useState<PeriodSummary[]>([]);
  const [salesTaxSummary, setSalesTaxSummary] = useState<TaxSummary | null>(null);
  const [purchasesTaxSummary, setPurchasesTaxSummary] = useState<TaxSummary | null>(null);
  const [topClients, setTopClients] = useState<TopEntity[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopEntity[]>([]);
  const [salesDocumentTypes, setSalesDocumentTypes] = useState<DocumentDistribution[]>([]);
  const [purchasesDocumentTypes, setPurchasesDocumentTypes] = useState<DocumentDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get last valid period if not provided (previous month for tax declarations)
  const getCurrentPeriod = useCallback(() => {
    if (periodCode) return periodCode;
    // Return previous month (last closed period for SUNAT declarations)
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
  }, [periodCode]);

  // Load period data
  const loadPeriodData = useCallback(
    async (period: string) => {
      if (!currentCompany) {
        setError('No hay empresa seleccionada');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Extract year from period
        const year = parseInt(period.substring(0, 4));

        // Load all analytics data in parallel
        const [
          salesMetrics,
          _purchasesMetrics,
          salesComp,
          purchasesComp,
          yearSummary,
          salesTrendData,
          purchasesTrendData,
          salesTax,
          purchasesTax,
          clients,
          suppliers,
          salesDocs,
          purchasesDocs
        ] = await Promise.all([
          analyticsRepo.getDashboardMetrics(currentCompany.id, period, 'sales'),
          analyticsRepo.getDashboardMetrics(currentCompany.id, period, 'purchases'),
          analyticsRepo.getPeriodComparison(currentCompany.id, period, 'sales'),
          analyticsRepo.getPeriodComparison(currentCompany.id, period, 'purchases'),
          analyticsRepo.getYearlySummary(currentCompany.id, year),
          analyticsRepo.getMonthlyTrend(currentCompany.id, year, 'sales'),
          analyticsRepo.getMonthlyTrend(currentCompany.id, year, 'purchases'),
          analyticsRepo.getTaxSummary(currentCompany.id, period, 'sales'),
          analyticsRepo.getTaxSummary(currentCompany.id, period, 'purchases'),
          analyticsRepo.getTopClients(currentCompany.id, period, 10),
          analyticsRepo.getTopSuppliers(currentCompany.id, period, 10),
          analyticsRepo.getDocumentDistribution(currentCompany.id, period, 'sales'),
          analyticsRepo.getDocumentDistribution(currentCompany.id, period, 'purchases')
        ]);

        // Update state
        setCurrentMetrics(salesMetrics); // Or combine sales and purchases metrics as needed
        setYearlyData(yearSummary);
        setSalesComparison(salesComp);
        setPurchasesComparison(purchasesComp);
        setSalesTrend(salesTrendData);
        setPurchasesTrend(purchasesTrendData);
        setSalesTaxSummary(salesTax);
        setPurchasesTaxSummary(purchasesTax);
        setTopClients(clients);
        setTopSuppliers(suppliers);
        setSalesDocumentTypes(salesDocs);
        setPurchasesDocumentTypes(purchasesDocs);
      } catch {
        setError('Error al cargar datos analíticos');
      } finally {
        setIsLoading(false);
      }
    },
    [currentCompany, analyticsRepo]
  );

  // Refresh data
  const refreshData = useCallback(async () => {
    const period = getCurrentPeriod();
    await loadPeriodData(period);
  }, [getCurrentPeriod, loadPeriodData]);

  // Load data on mount and when company or period changes
  useEffect(() => {
    if (currentCompany) {
      const period = getCurrentPeriod();
      loadPeriodData(period);
    }
  }, [currentCompany, getCurrentPeriod, loadPeriodData]);

  return {
    // Data
    currentMetrics,
    yearlyData,
    salesComparison,
    purchasesComparison,
    salesTrend,
    purchasesTrend,
    salesTaxSummary,
    purchasesTaxSummary,
    topClients,
    topSuppliers,
    salesDocumentTypes,
    purchasesDocumentTypes,

    // States
    isLoading,
    error,

    // Actions
    refreshData,
    loadPeriodData
  };
}

/**
 * Hook for specific period comparison
 */
export function usePeriodComparison(periodCode: string, type: 'sales' | 'purchases') {
  const { company: currentCompany } = useCompany();
  const [analyticsRepo] = useState<AnalyticsRepository>(() => RepositoryFactory.getAnalyticsRepository());
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!currentCompany || !periodCode) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await analyticsRepo.getPeriodComparison(currentCompany.id, periodCode, type);
        if (!cancelled) {
          setComparison(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentCompany, periodCode, type, analyticsRepo]);

  return { comparison, isLoading };
}

/**
 * Hook for yearly summary
 */
export function useYearlySummary(year?: number) {
  const { company: currentCompany } = useCompany();
  const [analyticsRepo] = useState<AnalyticsRepository>(() => RepositoryFactory.getAnalyticsRepository());
  const [summary, setSummary] = useState<YearlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const targetYear = year || new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!currentCompany) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await analyticsRepo.getYearlySummary(currentCompany.id, targetYear);
        if (!cancelled) {
          setSummary(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentCompany, targetYear, analyticsRepo]);

  return { summary, isLoading };
}
