import React from 'react';
import { DollarSign, CreditCard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { QuickStatsCard } from './QuickStatsCard';

/**
 * Metrics with optional trend data
 */
interface Metrics {
  total: number;
  vat: number;
  max: number;
  trend?: {
    value: number;
    percentage: number;
    isPositive: boolean;
  };
  vatTrend?: {
    value: number;
    percentage: number;
    isPositive: boolean;
  };
  maxTrend?: {
    value: number;
    percentage: number;
    isPositive: boolean;
  };
}

/**
 * Financial Summary Props
 */
interface FinancialSummaryProps {
  comparisonOffset: number;
  onComparisonOffsetChange: (value: string) => void;
  salesMetrics: Metrics;
  purchasesMetrics: Metrics;
  formatCurrency: (amount: number) => string;
}

/**
 * Financial Summary Component
 * Displays sales and purchases metrics with comparison trends
 */
export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  comparisonOffset,
  onComparisonOffsetChange,
  salesMetrics,
  purchasesMetrics,
  formatCurrency
}) => {
  // Format comparison text based on offset
  const formatComparisonText = (offset: number): string => {
    if (offset === 1) return '1 mes atrás';
    return `${offset} meses atrás`;
  };

  const comparisonText = formatComparisonText(comparisonOffset);

  return (
    <div className="space-y-6">
      {/* Header with Comparison Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Resumen Financiero</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Comparar con:</span>
          <Select value={comparisonOffset.toString()} onValueChange={onComparisonOffsetChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 mes atrás</SelectItem>
              <SelectItem value="2">2 meses atrás</SelectItem>
              <SelectItem value="3">3 meses atrás</SelectItem>
              <SelectItem value="6">6 meses atrás</SelectItem>
              <SelectItem value="12">12 meses atrás</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Column */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <h4 className="text-lg font-semibold">Ventas</h4>
          </div>

          {/* Metrics */}
          <QuickStatsCard
            title="Total Ventas"
            value={formatCurrency(salesMetrics.total)}
            subtitle={salesMetrics.total > 0 ? 'Ingresos totales' : 'Sin actividad reciente'}
            trend={salesMetrics.trend}
            comparisonText={comparisonText}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <QuickStatsCard
              title="IGV Ventas"
              value={formatCurrency(salesMetrics.max)}
              subtitle="IGV Cobrado"
              trend={salesMetrics.maxTrend}
              comparisonText={comparisonText}
            />
            <QuickStatsCard
              title="Max Venta"
              value={formatCurrency(salesMetrics.vat)}
              subtitle="Mayor transacción"
              trend={salesMetrics.vatTrend}
              comparisonText={comparisonText}
            />
          </div>
        </div>

        {/* Purchases Column */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <h4 className="text-lg font-semibold">Compras</h4>
          </div>

          {/* Metrics */}
          <QuickStatsCard
            title="Total Compras"
            value={formatCurrency(purchasesMetrics.total)}
            subtitle={purchasesMetrics.total > 0 ? 'Importe total' : 'Sin actividad reciente'}
            trend={
              purchasesMetrics.trend
                ? {
                    ...purchasesMetrics.trend,
                    isPositive: !purchasesMetrics.trend.isPositive
                  }
                : undefined
            }
            comparisonText={comparisonText}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <QuickStatsCard
              title="IGV Compras"
              value={formatCurrency(purchasesMetrics.max)}
              subtitle="IGV Pagado"
              trend={
                purchasesMetrics.maxTrend
                  ? {
                      ...purchasesMetrics.maxTrend,
                      isPositive: !purchasesMetrics.maxTrend.isPositive
                    }
                  : undefined
              }
              comparisonText={comparisonText}
            />
            <QuickStatsCard
              title="Max Compra"
              value={formatCurrency(purchasesMetrics.vat)}
              subtitle="Mayor transacción"
              trend={
                purchasesMetrics.vatTrend
                  ? {
                      ...purchasesMetrics.vatTrend,
                      isPositive: !purchasesMetrics.vatTrend.isPositive
                    }
                  : undefined
              }
              comparisonText={comparisonText}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
