import { describe, it, expect, vi } from 'vitest';

vi.mock('../BookTypeCard', () => ({ BookTypeCard: () => <div data-testid="btc" /> }));
vi.mock('../QuickStatsCard', () => ({ QuickStatsCard: () => <div data-testid="qsc" /> }));

import { render, screen } from '@testing-library/react';
import { PeriodMetricsSection } from '../PeriodMetricsSection';

const metrics = {
  totalSales: 1000,
  totalPurchases: 500,
  salesCount: 10,
  purchasesCount: 5,
  salesVat: 180,
  purchasesVat: 90,
  netBalance: 500
};

describe('PeriodMetricsSection', () => {
  it('cuando no hay periodo seleccionado muestra empty state', () => {
    render(
      <PeriodMetricsSection
        selectedPeriod={null}
        periodMetrics={metrics}
        comparisonMetrics={null}
        comparisonOffset={1}
        onComparisonOffsetChange={() => undefined}
        onNavigateToSales={() => undefined}
        onNavigateToPurchases={() => undefined}
        formatCurrency={(n) => `S/ ${n}`}
        calculateTrend={() => ({ value: 0, percentage: 0, isPositive: true })}
      />
    );
    expect(screen.getByText(/Selecciona un periodo/)).toBeInTheDocument();
  });

  it('con periodo renderiza secciones', () => {
    render(
      <PeriodMetricsSection
        selectedPeriod="202501"
        periodMetrics={metrics}
        comparisonMetrics={{ totalSales: 800, totalPurchases: 400, salesVat: 144, purchasesVat: 72 }}
        comparisonOffset={1}
        onComparisonOffsetChange={() => undefined}
        onNavigateToSales={() => undefined}
        onNavigateToPurchases={() => undefined}
        formatCurrency={(n) => `S/ ${n}`}
        calculateTrend={(c, p) => ({ value: c - p, percentage: 10, isPositive: c > p })}
      />
    );
    expect(screen.getAllByTestId('btc').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('qsc').length).toBeGreaterThan(0);
  });
});
