import React from 'react';
import { DollarSign, TrendingUp, ShoppingCart, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import ReactECharts from 'echarts-for-react';

/**
 * Monthly data for yearly analysis
 */
interface MonthlyData {
  month: string;
  sales: number;
  purchases: number;
  salesCount: number;
  purchasesCount: number;
  salesVat: number;
  purchasesVat: number;
  salesBI: number;
  purchasesBI: number;
}

/**
 * Yearly totals
 */
interface YearlyTotals {
  totalSales: number;
  totalPurchases: number;
  totalSalesVat: number;
  totalPurchasesVat: number;
}

/**
 * Yearly Analysis Section Props
 */
interface YearlyAnalysisSectionProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  yearlyData: MonthlyData[];
  yearlyTotals: YearlyTotals;
  formatCurrency: (amount: number) => string;
}

/**
 * Mini Chart Component
 * Displays a professional chart using ECharts
 * Supports both bar and line chart types
 */
interface MiniChartProps {
  title: string;
  data: MonthlyData[];
  dataKey: keyof MonthlyData;
  color: string;
  formatValue?: (value: number) => string;
  /** Chart type: 'bar' for bar chart, 'line' for line chart with area */
  chartType?: 'bar' | 'line';
}

const MiniChart: React.FC<MiniChartProps> = ({
  title,
  data,
  dataKey,
  color,
  formatValue,
  chartType = 'bar'  // Default to bar chart
}) => {
  // Ensure we have 12 months of data with proper month labels
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dec'];

  const chartData = Array.from({ length: 12 }, (_, index) => {
    const monthData = data[index];
    return monthData ? Number(monthData[dataKey]) : 0;
  });

  const option = {
    grid: {
      left: '10%',
      right: '5%',
      top: '10%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: monthNames,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 10,
        color: 'hsl(var(--muted-foreground))'
      }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'hsl(var(--border))',
          opacity: 0.3
        }
      },
      axisLabel: {
        fontSize: 10,
        color: 'hsl(var(--muted-foreground))',
        formatter: (value: number) => {
          if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
          return value.toString();
        }
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'hsl(var(--background))',
      borderColor: 'hsl(var(--border))',
      textStyle: {
        color: 'hsl(var(--foreground))',
        fontSize: 12
      },
      formatter: (params: Array<{ name: string; value: number }>) => {
        const param = params[0];
        const displayValue = formatValue ? formatValue(param.value) : param.value.toLocaleString();
        return `<div style="padding: 4px;">
          <div style="font-size: 10px; margin-bottom: 4px;">${param.name}</div>
          <div style="font-weight: bold; color: ${color}; font-size: 12px;">${displayValue}</div>
        </div>`;
      }
    },
    series: [
      chartType === 'bar'
        ? {
            data: chartData,
            type: 'bar',
            itemStyle: {
              color,
              borderRadius: [4, 4, 0, 0]
            },
            barMaxWidth: 40
          }
        : {
            data: chartData,
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              color,
              width: 2
            },
            itemStyle: {
              color
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: `${color}40` },  // color with 25% opacity at top
                  { offset: 1, color: `${color}10` }   // color with 6% opacity at bottom
                ]
              }
            }
          }
    ]
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <ReactECharts
          key={`${dataKey}-${chartType}`}
          option={option}
          style={{ height: '120px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </CardContent>
    </Card>
  );
};

/**
 * Yearly Analysis Content Component (without selector)
 * Just the metrics and charts content
 */
interface YearlyAnalysisContentProps {
  selectedYear: number;
  yearlyData: MonthlyData[];
  yearlyTotals: YearlyTotals;
  formatCurrency: (amount: number) => string;
}

export const YearlyAnalysisContent: React.FC<YearlyAnalysisContentProps> = ({
  selectedYear,
  yearlyData,
  yearlyTotals,
  formatCurrency
}) => {
  // Calculate fiscal balance
  const debitoFiscal = yearlyTotals.totalSalesVat;
  const creditoFiscal = yearlyTotals.totalPurchasesVat;

  return (
    <div className="w-full space-y-6">
      {/* Summary Cards - Split into Ventas and Compras sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ventas Section */}
        <div className="space-y-4">
          {/* Main Title for Ventas */}
          <h2 className="text-lg font-bold text-emerald-600">Resumen Anual de Ventas {selectedYear}</h2>

          {/* Metrics Subsection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Métricas de Ventas</h3>
            <div className="grid gap-3">
              {/* Ventas Totales */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Ventas Totales</p>
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50">
                        <DollarSign className="h-3 w-3 text-emerald-600" />
                      </div>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(yearlyTotals.totalSales)}</p>
                    <p className="text-[10px] text-muted-foreground">Año {selectedYear}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Débito Fiscal */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Débito Fiscal</p>
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50">
                        <TrendingUp className="h-3 w-3 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(debitoFiscal)}</p>
                    <p className="text-[10px] text-muted-foreground">IGV por cobrar</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Compras Section */}
        <div className="space-y-4">
          {/* Main Title for Compras */}
          <h2 className="text-lg font-bold text-rose-600">Resumen Anual de Compras {selectedYear}</h2>

          {/* Metrics Subsection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Métricas de Compras</h3>
            <div className="grid gap-3">
              {/* Compras Totales */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Compras Totales</p>
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50">
                        <ShoppingCart className="h-3 w-3 text-rose-600" />
                      </div>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(yearlyTotals.totalPurchases)}</p>
                    <p className="text-[10px] text-muted-foreground">Año {selectedYear}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Crédito Fiscal */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Crédito Fiscal</p>
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-50">
                        <TrendingDown className="h-3 w-3 text-purple-600" />
                      </div>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(creditoFiscal)}</p>
                    <p className="text-[10px] text-muted-foreground">IGV por favor</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid - Ventas left, Compras right */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ventas Column - Left (2x2 grid) */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Análisis de Ventas</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniChart
              title="Total CP - Ventas"
              data={yearlyData}
              dataKey="sales"
              color="#10b981"
              formatValue={formatCurrency}
              chartType="bar"
            />
            <MiniChart
              title="IGV/IPM - Ventas"
              data={yearlyData}
              dataKey="salesVat"
              color="#10b981"
              formatValue={formatCurrency}
              chartType="line"
            />
            <MiniChart
              title="Base Imponible Gravada - Ventas"
              data={yearlyData}
              dataKey="salesBI"
              color="#10b981"
              formatValue={formatCurrency}
              chartType="bar"
            />
            <MiniChart
              title="Registros - Ventas"
              data={yearlyData}
              dataKey="salesCount"
              color="#10b981"
              formatValue={(value) => value.toLocaleString()}
              chartType="line"
            />
          </div>
        </div>

        {/* Compras Column - Right (2x2 grid) */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Análisis de Compras</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniChart
              title="Base Imponible Gravada DG - Compras"
              data={yearlyData}
              dataKey="purchasesBI"
              color="#f43f5e"
              formatValue={formatCurrency}
              chartType="bar"
            />
            <MiniChart
              title="IGV/IPM DG - Compras"
              data={yearlyData}
              dataKey="purchasesVat"
              color="#f43f5e"
              formatValue={formatCurrency}
              chartType="line"
            />
            <MiniChart
              title="Total CP - Compras"
              data={yearlyData}
              dataKey="purchases"
              color="#f43f5e"
              formatValue={formatCurrency}
              chartType="bar"
            />
            <MiniChart
              title="Registros - Compras"
              data={yearlyData}
              dataKey="purchasesCount"
              color="#f43f5e"
              formatValue={(value) => value.toLocaleString()}
              chartType="line"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Yearly Analysis Section Component (with selector)
 * Displays yearly trends and totals with monthly breakdown
 * Includes year selector
 */
export const YearlyAnalysisSection: React.FC<YearlyAnalysisSectionProps> = ({
  selectedYear,
  onYearChange,
  yearlyData,
  yearlyTotals,
  formatCurrency
}) => {
  // Generate year options (current year and 2 previous years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="flex flex-col h-full">
      {/* Year Selector */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Año:</span>
          <Select value={selectedYear.toString()} onValueChange={(v) => onYearChange(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <YearlyAnalysisContent
          selectedYear={selectedYear}
          yearlyData={yearlyData}
          yearlyTotals={yearlyTotals}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
};
