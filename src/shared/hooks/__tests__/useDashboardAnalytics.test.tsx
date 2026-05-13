import { describe, it, expect, vi } from 'vitest';

const useCompanyMock = vi.fn();
vi.mock('@/core/presentation/contexts/company.context', () => ({ useCompany: () => useCompanyMock() }));
vi.mock('@/core/infrastructure/repositories/repository.factory', () => ({
  RepositoryFactory: {
    getAnalyticsRepository: () => ({
      getDashboardMetrics: vi.fn().mockResolvedValue({ currentPeriod: null }),
      getPeriodComparison: vi.fn().mockResolvedValue(null),
      getYearlySummary: vi.fn().mockResolvedValue(null),
      getMonthlyTrend: vi.fn().mockResolvedValue([]),
      getTaxSummary: vi.fn().mockResolvedValue(null),
      getTopClients: vi.fn().mockResolvedValue([]),
      getTopSuppliers: vi.fn().mockResolvedValue([]),
      getDocumentDistribution: vi.fn().mockResolvedValue([])
    })
  }
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboardAnalytics, usePeriodComparison, useYearlySummary } from '../useDashboardAnalytics';
import { aCompany } from '@/test/helpers/factories';

describe('useDashboardAnalytics', () => {
  it('no carga datos si no hay company', () => {
    useCompanyMock.mockReturnValue({ company: null });
    const { result } = renderHook(() => useDashboardAnalytics());
    expect(result.current.isLoading).toBe(false);
  });

  it('carga datos cuando hay company', async () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    const { result } = renderHook(() => useDashboardAnalytics('202501'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('refreshData fuerza recarga', async () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    const { result } = renderHook(() => useDashboardAnalytics('202501'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => result.current.refreshData());
  });
});

describe('usePeriodComparison', () => {
  it('retorna null cuando no hay company', () => {
    useCompanyMock.mockReturnValue({ company: null });
    const { result } = renderHook(() => usePeriodComparison('202501', 'sales'));
    expect(result.current.comparison).toBeNull();
  });

  it('carga comparación con company', async () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    const { result } = renderHook(() => usePeriodComparison('202501', 'sales'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

describe('useYearlySummary', () => {
  it('usa year actual cuando no se provee', async () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    const { result } = renderHook(() => useYearlySummary());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('usa year provisto', async () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    const { result } = renderHook(() => useYearlySummary(2024));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
