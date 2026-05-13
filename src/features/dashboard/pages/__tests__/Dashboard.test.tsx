import { describe, it, expect, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/features/dashboard/components/DashboardHeader', () => ({
  DashboardHeader: () => <div data-testid="header" />
}));
vi.mock('@/features/dashboard/components/InvoiceCard', () => ({
  InvoiceCard: () => <div data-testid="card" />
}));
vi.mock('@/features/dashboard/components/FinancialSummary', () => ({
  FinancialSummary: () => <div />
}));
vi.mock('@/features/dashboard/components/YearlyAnalysisSection', () => ({
  YearlyAnalysisContent: () => <div />
}));
vi.mock('@/shared/components/common/PeriodSelectorWithButton', () => ({
  PeriodSelectorWithButton: () => <div />
}));

const useCompanyMock = vi.fn();
const usePeriodMock = vi.fn();
vi.mock('@/core/presentation/contexts/company.context', () => ({ useCompany: () => useCompanyMock() }));
vi.mock('@/core/presentation/contexts/period.context', () => ({ usePeriod: () => usePeriodMock() }));

vi.mock('@/core/infrastructure/repositories/repository.factory', () => ({
  RepositoryFactory: {
    getPeriodRepository: () => ({ getAvailablePeriods: vi.fn().mockResolvedValue([]) }),
    getAnalyticsRepository: () => ({
      getSalesPeriodSummary: vi.fn().mockResolvedValue(null),
      getPurchasesPeriodSummary: vi.fn().mockResolvedValue(null),
      getDashboardMetrics: vi.fn().mockResolvedValue({}),
      getYearlySummary: vi.fn().mockResolvedValue(null),
      getTaxSummary: vi.fn().mockResolvedValue(null),
      getMonthlyTrend: vi.fn().mockResolvedValue([])
    }),
    getSalesRepository: () => ({ getAll: vi.fn().mockResolvedValue([]) }),
    getPurchasesRepository: () => ({ getAll: vi.fn().mockResolvedValue([]) })
  }
}));

import { render, screen } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import { aCompany } from '@/test/helpers/factories';

describe('Dashboard (smoke)', () => {
  it('renderiza header sin crash', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    usePeriodMock.mockReturnValue({ selectedPeriod: '202501', loadPeriod: vi.fn() });
    render(<Dashboard />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });
});
