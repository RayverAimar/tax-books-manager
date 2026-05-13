import { describe, it, expect, vi } from 'vitest';

vi.mock('echarts-for-react', () => ({
  default: () => <div data-testid="chart" />
}));

import { render, screen } from '@testing-library/react';
import { YearlyAnalysisContent } from '../YearlyAnalysisSection';

describe('YearlyAnalysisContent (smoke)', () => {
  it('renderiza sin crash con datos básicos', () => {
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: `${i + 1}`.padStart(2, '0'),
      sales: i * 100,
      purchases: i * 50,
      salesCount: i,
      purchasesCount: i,
      salesVat: i * 18,
      purchasesVat: i * 9,
      salesBI: i * 80,
      purchasesBI: i * 40
    }));
    render(
      <YearlyAnalysisContent
        selectedYear={2025}
        yearlyData={monthlyData}
        yearlyTotals={{ totalSales: 12000, totalPurchases: 6000, totalSalesVat: 2160, totalPurchasesVat: 1080 }}
        formatCurrency={(n) => `S/ ${n}`}
      />
    );
    expect(screen.getAllByTestId('chart').length).toBeGreaterThan(0);
  });
});
