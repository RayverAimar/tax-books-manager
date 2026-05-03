import React from 'react';
import { ShoppingCart, Package, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { BookTypeCard } from './BookTypeCard';
import { QuickStatsCard } from './QuickStatsCard';

interface PeriodMetrics {
  totalSales: number;
  totalPurchases: number;
  salesCount: number;
  purchasesCount: number;
  salesVat: number;
  purchasesVat: number;
  netBalance: number;
}

interface ComparisonMetrics {
  totalSales: number;
  totalPurchases: number;
  salesVat: number;
  purchasesVat: number;
}

interface PeriodMetricsSectionProps {
  selectedPeriod: string | null;
  periodMetrics: PeriodMetrics;
  comparisonMetrics: ComparisonMetrics | null;
  comparisonOffset: number;
  onComparisonOffsetChange: (value: string) => void;
  onNavigateToSales: () => void;
  onNavigateToPurchases: () => void;
  formatCurrency: (amount: number) => string;
  calculateTrend: (
    current: number,
    comparison: number
  ) => {
    value: number;
    percentage: number;
    isPositive: boolean;
  };
}

/**
 * Period Metrics Section Component
 * Displays metrics for the selected period with comparison
 */
export const PeriodMetricsSection: React.FC<PeriodMetricsSectionProps> = ({
  selectedPeriod,
  periodMetrics,
  comparisonMetrics,
  comparisonOffset,
  onComparisonOffsetChange,
  onNavigateToSales,
  onNavigateToPurchases,
  formatCurrency,
  calculateTrend
}) => {
  if (!selectedPeriod) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Selecciona un periodo</h3>
        <p className="text-sm text-muted-foreground">Usa el selector de periodo arriba para ver las métricas</p>
      </div>
    );
  }

  return (
    <>
      {/* Navigation Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BookTypeCard
          type="sales"
          title="Registro de Ventas"
          description="Gestiona facturas, boletas y comprobantes emitidos"
          icon={<ShoppingCart className="h-8 w-8" />}
          stats={{
            periods: periodMetrics.salesCount,
            currentPeriod: selectedPeriod
          }}
          onClick={onNavigateToSales}
        />

        <BookTypeCard
          type="purchases"
          title="Registro de Compras"
          description="Gestiona facturas y comprobantes recibidos"
          icon={<Package className="h-8 w-8" />}
          stats={{
            periods: periodMetrics.purchasesCount,
            currentPeriod: selectedPeriod
          }}
          onClick={onNavigateToPurchases}
        />
      </div>

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Métricas del Periodo</span>
        </div>
      </div>

      {/* Comparison Period Selector */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm font-medium text-muted-foreground">Comparar con:</span>
        <Select value={comparisonOffset.toString()} onValueChange={onComparisonOffsetChange}>
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1" className="cursor-pointer">
              1 mes atrás
            </SelectItem>
            <SelectItem value="2" className="cursor-pointer">
              2 meses atrás
            </SelectItem>
            <SelectItem value="3" className="cursor-pointer">
              3 meses atrás
            </SelectItem>
            <SelectItem value="6" className="cursor-pointer">
              6 meses atrás
            </SelectItem>
            <SelectItem value="12" className="cursor-pointer">
              1 año atrás
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Period Metrics - Organized: Sales | Purchases */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ventas Section */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickStatsCard
              title="Total Ventas"
              value={formatCurrency(periodMetrics.totalSales)}
              subtitle={`${periodMetrics.salesCount} registros`}
              trend={
                comparisonMetrics ? calculateTrend(periodMetrics.totalSales, comparisonMetrics.totalSales) : undefined
              }
            />
            <QuickStatsCard
              title="IGV Ventas"
              value={formatCurrency(periodMetrics.salesVat)}
              subtitle="IGV cobrado"
              trend={comparisonMetrics ? calculateTrend(periodMetrics.salesVat, comparisonMetrics.salesVat) : undefined}
            />
          </div>
        </div>

        {/* Compras Section */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickStatsCard
              title="Total Compras"
              value={formatCurrency(periodMetrics.totalPurchases)}
              subtitle={`${periodMetrics.purchasesCount} registros`}
              trend={
                comparisonMetrics
                  ? {
                      ...calculateTrend(periodMetrics.totalPurchases, comparisonMetrics.totalPurchases),
                      isPositive: !calculateTrend(periodMetrics.totalPurchases, comparisonMetrics.totalPurchases)
                        .isPositive
                    }
                  : undefined
              }
            />
            <QuickStatsCard
              title="IGV Compras"
              value={formatCurrency(periodMetrics.purchasesVat)}
              subtitle="IGV pagado"
              trend={
                comparisonMetrics
                  ? {
                      ...calculateTrend(periodMetrics.purchasesVat, comparisonMetrics.purchasesVat),
                      isPositive: !calculateTrend(periodMetrics.purchasesVat, comparisonMetrics.purchasesVat).isPositive
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Balance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <QuickStatsCard
          title="Balance Neto"
          value={formatCurrency(periodMetrics.netBalance)}
          subtitle={periodMetrics.netBalance >= 0 ? 'Ganancia' : 'Pérdida'}
        />
        <QuickStatsCard
          title="IGV por Pagar"
          value={formatCurrency(periodMetrics.salesVat - periodMetrics.purchasesVat)}
          subtitle="Balance IGV"
        />
      </div>
    </>
  );
};
