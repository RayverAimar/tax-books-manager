import { describe, it, expect, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

const useCompanyMock = vi.fn();
const usePeriodMock = vi.fn();
vi.mock('@/core/presentation/contexts/company.context', () => ({ useCompany: () => useCompanyMock() }));
vi.mock('@/core/presentation/contexts/period.context', () => ({ usePeriod: () => usePeriodMock() }));

vi.mock('@/core/infrastructure/repositories/repository.factory', () => ({
  RepositoryFactory: {
    getSalesRepository: () => ({
      getAll: vi.fn().mockResolvedValue([]),
      replacePeriodRecords: vi.fn(),
      updateFields: vi.fn(),
      delete: vi.fn(),
      create: vi.fn()
    }),
    getPurchasesRepository: () => ({
      getAll: vi.fn().mockResolvedValue([]),
      replacePeriodRecords: vi.fn(),
      updateFields: vi.fn(),
      delete: vi.fn(),
      create: vi.fn()
    }),
    getPeriodRepository: () => ({ getAvailablePeriods: vi.fn().mockResolvedValue([]), setDeclared: vi.fn() }),
    getAnalyticsRepository: () => ({ getTaxSummary: vi.fn().mockResolvedValue(null) })
  }
}));

vi.mock('@/shared/components/common/data-table/DataTable', () => ({
  DataTable: () => <div data-testid="data-table" />
}));
vi.mock('@/shared/components/common/templates/InvoiceListHeader', () => ({
  InvoiceListHeader: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div data-testid="header">{children}</div>,
    {
      Back: () => <div />,
      Title: () => <div />,
      Actions: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Loading: () => <div />
    }
  )
}));

import { render, screen } from '@testing-library/react';
import { InvoiceListPage } from '../InvoiceListPage';
import { aCompany } from '@/test/helpers/factories';

function MyForm() {
  return <div />;
}

describe('InvoiceListPage (smoke)', () => {
  it('renderiza para sales sin crash', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    usePeriodMock.mockReturnValue({
      selectedPeriod: '202501',
      period: null,
      loadPeriod: vi.fn(),
      toggleDeclared: vi.fn()
    });
    render(
      <InvoiceListPage
        type="sales"
        title="Ventas"
        singularLabel="registro"
        pluralLabel="registros"
        addButtonLabel="Agregar"
        dialogTitle="Nuevo"
        dialogDescription="x"
        successMessage={{ added: 'X', addedDescription: 'x' }}
        FormComponent={MyForm}
        transformFormData={(d) => d}
      />
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renderiza para purchases sin crash', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    usePeriodMock.mockReturnValue({
      selectedPeriod: '202501',
      period: null,
      loadPeriod: vi.fn(),
      toggleDeclared: vi.fn()
    });
    render(
      <InvoiceListPage
        type="purchases"
        title="Compras"
        singularLabel="registro"
        pluralLabel="registros"
        addButtonLabel="Agregar"
        dialogTitle="Nuevo"
        dialogDescription="x"
        successMessage={{ added: 'X', addedDescription: 'x' }}
        FormComponent={MyForm}
        transformFormData={(d) => d}
      />
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });
});
