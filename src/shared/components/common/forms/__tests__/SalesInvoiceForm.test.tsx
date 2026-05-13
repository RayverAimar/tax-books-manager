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
import { SalesInvoiceForm } from '../SalesInvoiceForm';
import { aCompany } from '@/test/helpers/factories';

describe('SalesInvoiceForm (smoke)', () => {
  it('renderiza el formulario con campos clave', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    usePeriodMock.mockReturnValue({ selectedPeriod: '202501' });
    render(<SalesInvoiceForm onSubmit={() => undefined} />);
    expect(screen.getAllByText(/RUC/i).length).toBeGreaterThan(0);
  });

  it('renderiza con defaults parciales', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    usePeriodMock.mockReturnValue({ selectedPeriod: '202501' });
    render(<SalesInvoiceForm onSubmit={() => undefined} defaultValues={{ ruc: '12345678901' }} />);
    expect(screen.getByDisplayValue('12345678901')).toBeInTheDocument();
  });
});
