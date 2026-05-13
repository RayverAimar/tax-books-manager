import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinancialSummary } from '../FinancialSummary';

describe('FinancialSummary', () => {
  it('renderiza títulos de ventas/compras y métricas', () => {
    render(
      <FinancialSummary
        comparisonOffset={1}
        onComparisonOffsetChange={vi.fn()}
        salesMetrics={{ total: 1000, vat: 180, max: 500 }}
        purchasesMetrics={{ total: 700, vat: 126, max: 300 }}
        formatCurrency={(n) => `S/ ${n}`}
      />
    );
    expect(screen.getByText('Ventas')).toBeInTheDocument();
    expect(screen.getByText('Compras')).toBeInTheDocument();
    expect(screen.getByText('Total Ventas')).toBeInTheDocument();
  });

  it('"Sin actividad reciente" si total=0', () => {
    render(
      <FinancialSummary
        comparisonOffset={3}
        onComparisonOffsetChange={vi.fn()}
        salesMetrics={{ total: 0, vat: 0, max: 0 }}
        purchasesMetrics={{ total: 0, vat: 0, max: 0 }}
        formatCurrency={(n) => `S/ ${n}`}
      />
    );
    expect(screen.getAllByText(/Sin actividad/).length).toBeGreaterThan(0);
  });
});
