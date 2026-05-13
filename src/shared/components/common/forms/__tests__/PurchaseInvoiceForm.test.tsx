import { describe, it, expect, vi } from 'vitest';

const useCompanyMock = vi.fn();
const usePeriodMock = vi.fn();
vi.mock('@/core/presentation/contexts/company.context', () => ({
  useCompany: () => useCompanyMock()
}));
vi.mock('@/core/presentation/contexts/period.context', () => ({
  usePeriod: () => usePeriodMock()
}));
vi.mock('@/core/infrastructure/repositories/repository.factory', () => ({
  RepositoryFactory: {
    getSettingsRepository: () => ({ getApiKey: vi.fn().mockResolvedValue(null) })
  }
}));

import { render, screen } from '@testing-library/react';
import { PurchaseInvoiceForm } from '../PurchaseInvoiceForm';
import { aCompany } from '@/test/helpers/factories';

describe('PurchaseInvoiceForm (smoke)', () => {
  it('renderiza sin crash', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    usePeriodMock.mockReturnValue({ selectedPeriod: '202501' });
    render(<PurchaseInvoiceForm onSubmit={() => undefined} />);
    expect(screen.getAllByText(/RUC/i).length).toBeGreaterThan(0);
  });
});
