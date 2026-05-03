import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { DashboardHeader } from '../components/DashboardHeader';
import { InvoiceCard } from '../components/InvoiceCard';
import { FinancialSummary } from '../components/FinancialSummary';
import { YearlyAnalysisContent } from '../components/YearlyAnalysisSection';
import { PeriodSelectorWithButton } from '@/shared/components/common/PeriodSelectorWithButton';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { usePeriod } from '@/core/presentation/contexts/period.context';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import { PeriodUtils, type AvailablePeriod } from '@/core/domain/entities/period.entity';
import { useDataChangeListener } from '@/shared/lib/events/data-events';

/**
 * Dashboard Page
 * Main page after login - shows company overview and navigation
 */
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { selectedPeriod, loadPeriod } = usePeriod();
  const [, setAvailablePeriods] = useState<AvailablePeriod[]>([]);
  const [salesPeriods, setSalesPeriods] = useState<AvailablePeriod[]>([]);
  const [purchasesPeriods, setPurchasesPeriods] = useState<AvailablePeriod[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);
  const [activeTab, setActiveTab] = useState('period');
  const [refreshKey, setRefreshKey] = useState(0);
  const [periodMetrics, setPeriodMetrics] = useState({
    totalSales: 0,
    totalPurchases: 0,
    salesCount: 0,
    purchasesCount: 0,
    salesVat: 0,
    purchasesVat: 0,
    netBalance: 0,
    maxSale: 0,
    maxPurchase: 0
  });
  const [comparisonOffset, setComparisonOffset] = useState<number>(1);
  const [comparisonMetrics, setComparisonMetrics] = useState<{
    totalSales: number;
    totalPurchases: number;
    salesVat: number;
    purchasesVat: number;
    maxSale: number;
    maxPurchase: number;
  } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [yearlyData, setYearlyData] = useState<
    Array<{
      month: string;
      sales: number;
      purchases: number;
      salesCount: number;
      purchasesCount: number;
      salesVat: number;
      purchasesVat: number;
      salesBI: number;
      purchasesBI: number;
    }>
  >([]);
  const [yearlyTotals, setYearlyTotals] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalSalesVat: 0,
    totalPurchasesVat: 0
  });

  /**
   * Calculate comparison period by going back N months
   */
  const calculateComparisonPeriod = (currentPeriod: string, monthsBack: number): string => {
    const year = parseInt(currentPeriod.substring(0, 4));
    const month = parseInt(currentPeriod.substring(4, 6));

    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - monthsBack);

    const newYear = date.getFullYear();
    const newMonth = date.getMonth() + 1;

    return `${newYear}${newMonth.toString().padStart(2, '0')}`;
  };

  /**
   * Load available periods
   */
  const loadPeriods = useCallback(async () => {
    if (!company) return;

    try {
      setIsLoadingPeriods(true);
      const periodRepo = RepositoryFactory.getPeriodRepository();

      // Get all unique periods from both sales and purchases
      const [salesPeriodsData, purchasesPeriodsData] = await Promise.all([
        periodRepo.getAvailablePeriods(company.id, 'sales'),
        periodRepo.getAvailablePeriods(company.id, 'purchases')
      ]);

      // Store sales and purchases periods separately (for declared status)
      setSalesPeriods(salesPeriodsData);
      setPurchasesPeriods(purchasesPeriodsData);

      // Merge and deduplicate periods
      const periodMap = new Map<string, AvailablePeriod>();

      [...salesPeriodsData, ...purchasesPeriodsData].forEach((period) => {
        const existing = periodMap.get(period.code);
        if (!existing || (period.hasData && !existing.hasData)) {
          periodMap.set(period.code, period);
        } else if (existing && period.hasData) {
          // Merge record counts and last modified
          existing.recordCount = (existing.recordCount || 0) + (period.recordCount || 0);
          if (period.lastModified && (!existing.lastModified || period.lastModified > existing.lastModified)) {
            existing.lastModified = period.lastModified;
          }
        }
      });

      const mergedPeriods = Array.from(periodMap.values()).sort((a, b) => b.code.localeCompare(a.code));

      // If no periods exist, generate default ones
      const finalPeriods =
        mergedPeriods.length > 0
          ? mergedPeriods
          : PeriodUtils.getAvailablePeriods().map((p) => ({
              ...p,
              hasData: false,
              recordCount: undefined,
              lastModified: undefined
            }));
      setAvailablePeriods(finalPeriods);
    } catch {
      // Fallback to generated periods
      setAvailablePeriods(
        PeriodUtils.getAvailablePeriods().map((p) => ({
          ...p,
          hasData: false,
          recordCount: undefined,
          lastModified: undefined
        }))
      );
    } finally {
      setIsLoadingPeriods(false);
    }
  }, [company]);

  // Load periods on mount
  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  // Reload periods and metrics when window regains focus or becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page is visible again, reload periods
        loadPeriods();
      }
    };

    const handleFocus = () => {
      // Window regained focus, reload periods
      loadPeriods();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadPeriods]);

  // Listen for data change events from imports (single file or bulk)
  // This ensures metrics refresh automatically after any import operation
  useDataChangeListener(() => {
    // Reload periods list (in case new periods were imported)
    loadPeriods();
    // Trigger metrics refresh
    setRefreshKey((prev) => prev + 1);
  }, [loadPeriods]);

  /**
   * Load metrics for selected period (OPTIMIZED - uses aggregated queries)
   */
  useEffect(() => {
    if (!company || !selectedPeriod) return;

    let cancelled = false;

    const loadPeriodMetrics = async () => {
      try {
        const analyticsRepo = RepositoryFactory.getAnalyticsRepository();

        // ✅ OPTIMIZATION: uses SUM/COUNT in SQL instead of fetching all records
        const [salesSummary, purchasesSummary] = await Promise.all([
          analyticsRepo.getPeriodSummary(company.id, selectedPeriod, 'sales'),
          analyticsRepo.getPeriodSummary(company.id, selectedPeriod, 'purchases')
        ]);

        // SECURITY: Check if component is still mounted before updating state
        if (cancelled) return;

        setPeriodMetrics({
          totalSales: salesSummary?.totalAmount || 0,
          totalPurchases: purchasesSummary?.totalAmount || 0,
          salesCount: salesSummary?.recordCount || 0,
          purchasesCount: purchasesSummary?.recordCount || 0,
          salesVat: salesSummary?.vatTotal || 0,
          purchasesVat: purchasesSummary?.vatTotal || 0,
          netBalance: (salesSummary?.totalAmount || 0) - (purchasesSummary?.totalAmount || 0),
          maxSale: salesSummary?.maxTransaction || 0,
          maxPurchase: purchasesSummary?.maxTransaction || 0
        });
      } catch {
        // Ignore errors loading metrics
      }
    };

    loadPeriodMetrics();

    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
  }, [company, selectedPeriod, refreshKey]);

  /**
   * Load comparison metrics (OPTIMIZED - uses aggregated queries)
   */
  useEffect(() => {
    if (!company || !selectedPeriod) {
      setComparisonMetrics(null);
      return;
    }

    let cancelled = false;

    const loadComparisonMetrics = async () => {
      try {
        const comparisonPeriod = calculateComparisonPeriod(selectedPeriod, comparisonOffset);
        const analyticsRepo = RepositoryFactory.getAnalyticsRepository();

        // ✅ OPTIMIZATION: Reuses optimized aggregated queries
        const [salesSummary, purchasesSummary] = await Promise.all([
          analyticsRepo.getPeriodSummary(company.id, comparisonPeriod, 'sales'),
          analyticsRepo.getPeriodSummary(company.id, comparisonPeriod, 'purchases')
        ]);

        // SECURITY: Check if component is still mounted before updating state
        if (cancelled) return;

        setComparisonMetrics({
          totalSales: salesSummary?.totalAmount || 0,
          totalPurchases: purchasesSummary?.totalAmount || 0,
          salesVat: salesSummary?.vatTotal || 0,
          purchasesVat: purchasesSummary?.vatTotal || 0,
          maxSale: salesSummary?.maxTransaction || 0,
          maxPurchase: purchasesSummary?.maxTransaction || 0
        });
      } catch {
        if (!cancelled) {
          setComparisonMetrics(null);
        }
      }
    };

    loadComparisonMetrics();

    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
  }, [company, selectedPeriod, comparisonOffset, refreshKey]);

  /**
   * Load yearly data for charts (OPTIMIZED - eliminates N+1 problem)
   */
  useEffect(() => {
    if (!company || !selectedYear) {
      setYearlyData([]);
      setYearlyTotals({ totalSales: 0, totalPurchases: 0, totalSalesVat: 0, totalPurchasesVat: 0 });
      return;
    }

    let cancelled = false;

    const loadYearlyData = async () => {
      try {
        const analyticsRepo = RepositoryFactory.getAnalyticsRepository();
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // ✅ OPTIMIZATION: 24 queries → 2 queries (12 months × 2 types → 2 GROUP BY queries)
        const [salesMetrics, purchasesMetrics] = await Promise.all([
          analyticsRepo.getMonthlyTrend(company.id, selectedYear, 'sales'),
          analyticsRepo.getMonthlyTrend(company.id, selectedYear, 'purchases')
        ]);

        // SECURITY: Check if component is still mounted before updating state
        if (cancelled) return;

        // Create array of 12 months with metrics
        const yearData = Array.from({ length: 12 }, (_, index) => {
          const month = index + 1;
          const periodCode = `${selectedYear}${month.toString().padStart(2, '0')}`;

          const salesData = salesMetrics.find((m) => m.periodCode === periodCode);
          const purchasesData = purchasesMetrics.find((m) => m.periodCode === periodCode);

          return {
            month: monthNames[index],
            sales: salesData?.totalAmount || 0,
            purchases: purchasesData?.totalAmount || 0,
            salesCount: salesData?.recordCount || 0,
            purchasesCount: purchasesData?.recordCount || 0,
            salesVat: salesData?.vatTotal || 0,
            purchasesVat: purchasesData?.vatTotal || 0,
            salesBI: salesData?.taxableBaseTotal || 0,
            purchasesBI: purchasesData?.taxableBaseTotal || 0
          };
        });

        setYearlyData(yearData);

        // Calculate yearly totals
        const totals = yearData.reduce(
          (acc, month) => ({
            totalSales: acc.totalSales + month.sales,
            totalPurchases: acc.totalPurchases + month.purchases,
            totalSalesVat: acc.totalSalesVat + month.salesVat,
            totalPurchasesVat: acc.totalPurchasesVat + month.purchasesVat
          }),
          { totalSales: 0, totalPurchases: 0, totalSalesVat: 0, totalPurchasesVat: 0 }
        );
        setYearlyTotals(totals);
      } catch {
        if (!cancelled) {
          setYearlyData([]);
          setYearlyTotals({ totalSales: 0, totalPurchases: 0, totalSalesVat: 0, totalPurchasesVat: 0 });
        }
      }
    };

    loadYearlyData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
  }, [company, selectedYear, refreshKey]);

  // If no company, redirect to onboarding
  if (!company) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Building className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">No hay empresa registrada</h2>
          <p className="text-muted-foreground">Por favor, registra una empresa para comenzar</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Recargar Aplicación
          </Button>
        </div>
      </div>
    );
  }

  // Handle period selection
  const handlePeriodChange = async (newPeriod: string) => {
    if (!company) return;

    // Cargar periodo completo (incluye estado declared)
    await loadPeriod(newPeriod, company.id);
  };

  // Handle comparison offset change
  const handleComparisonOffsetChange = (value: string) => {
    setComparisonOffset(parseInt(value));
  };

  /**
   * Calculate trend (absolute difference and percentage change)
   * For sales/revenue: positive change = good (green)
   */
  const calculateTrend = (
    current: number,
    comparison: number
  ): { value: number; percentage: number; isPositive: boolean } => {
    const absoluteDifference = current - comparison;
    if (comparison === 0) {
      return {
        value: absoluteDifference,
        percentage: 0,
        isPositive: absoluteDifference >= 0
      };
    }
    const percentageChange = (absoluteDifference / comparison) * 100;
    return {
      value: absoluteDifference,
      percentage: percentageChange,
      isPositive: absoluteDifference >= 0
    };
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Dashboard Header */}
      <DashboardHeader />

      {/* Main Content with Centered Tabs */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 max-w-7xl h-full flex flex-col">
          {/* Controls Container - Tabs + Selector */}
          <div className="space-y-3 pt-14">
            {/* Centered Tabs */}
            <div className="flex justify-center">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="grid w-[280px] grid-cols-2">
                  <TabsTrigger value="period">Por Periodo</TabsTrigger>
                  <TabsTrigger value="general">General</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Selector (changes based on active tab) */}
            {activeTab === 'period' ? (
              <div className="flex items-center justify-end">
                <PeriodSelectorWithButton
                  key={selectedPeriod || 'no-period'}
                  value={selectedPeriod}
                  onChange={handlePeriodChange}
                  disabled={isLoadingPeriods}
                />
              </div>
            ) : (
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Año:</span>
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(
                        (year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Dashboard Content Container - THIS GETS CENTERED */}
          <div className="flex-1 flex items-center justify-center">
            {activeTab === 'period' ? (
              // Period Dashboard Content
              !selectedPeriod ? (
                <div className="flex flex-col items-center justify-center">
                  <Building className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Selecciona un periodo</h3>
                  <p className="text-sm text-muted-foreground">
                    Usa el selector de periodo arriba para ver el dashboard
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-6">
                  {/* Registry Navigation Cards */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <InvoiceCard
                      type="sales"
                      title="Registro de Ventas"
                      description="Gestiona facturas, boletas y comprobantes emitidos"
                      recordCount={periodMetrics.salesCount}
                      declared={salesPeriods.find((p) => p.code === selectedPeriod)?.declared}
                      onClick={() => navigate('/sales')}
                    />
                    <InvoiceCard
                      type="purchases"
                      title="Registro de Compras"
                      description="Gestiona facturas y comprobantes recibidos"
                      recordCount={periodMetrics.purchasesCount}
                      declared={purchasesPeriods.find((p) => p.code === selectedPeriod)?.declared}
                      onClick={() => navigate('/purchases')}
                    />
                  </div>

                  {/* Financial Summary */}
                  <FinancialSummary
                    comparisonOffset={comparisonOffset}
                    onComparisonOffsetChange={handleComparisonOffsetChange}
                    salesMetrics={{
                      total: periodMetrics.totalSales,
                      vat: periodMetrics.salesVat,
                      max: periodMetrics.maxSale,
                      trend: comparisonMetrics
                        ? calculateTrend(periodMetrics.totalSales, comparisonMetrics.totalSales)
                        : undefined,
                      vatTrend: comparisonMetrics
                        ? calculateTrend(periodMetrics.salesVat, comparisonMetrics.salesVat)
                        : undefined,
                      maxTrend: comparisonMetrics
                        ? calculateTrend(periodMetrics.maxSale, comparisonMetrics.maxSale)
                        : undefined
                    }}
                    purchasesMetrics={{
                      total: periodMetrics.totalPurchases,
                      vat: periodMetrics.purchasesVat,
                      max: periodMetrics.maxPurchase,
                      trend: comparisonMetrics
                        ? calculateTrend(periodMetrics.totalPurchases, comparisonMetrics.totalPurchases)
                        : undefined,
                      vatTrend: comparisonMetrics
                        ? calculateTrend(periodMetrics.purchasesVat, comparisonMetrics.purchasesVat)
                        : undefined,
                      maxTrend: comparisonMetrics
                        ? calculateTrend(periodMetrics.maxPurchase, comparisonMetrics.maxPurchase)
                        : undefined
                    }}
                    formatCurrency={formatCurrency}
                  />
                </div>
              )
            ) : (
              // General Dashboard Content
              <div className="w-full space-y-6">
                <YearlyAnalysisContent
                  yearlyData={yearlyData}
                  yearlyTotals={yearlyTotals}
                  formatCurrency={formatCurrency}
                  selectedYear={selectedYear}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
