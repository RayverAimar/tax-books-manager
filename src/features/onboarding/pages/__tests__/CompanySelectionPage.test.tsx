import { describe, it, expect, vi } from 'vitest';

const useCompanyMock = vi.fn();
vi.mock('@/core/presentation/contexts/company.context', () => ({ useCompany: () => useCompanyMock() }));
vi.mock('@/features/onboarding/components/AddCompanyFlow', () => ({
  AddCompanyFlow: () => <div data-testid="add-flow" />
}));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { CompanySelectionPage } from '../CompanySelectionPage';
import { aCompany } from '@/test/helpers/factories';

describe('CompanySelectionPage', () => {
  it('isLoading muestra loader', () => {
    useCompanyMock.mockReturnValue({ companies: [], isLoading: true });
    render(<CompanySelectionPage />);
    expect(screen.getByText(/Cargando empresas/)).toBeInTheDocument();
  });

  it('lista empresas con RUC visible', () => {
    useCompanyMock.mockReturnValue({
      companies: [aCompany({ id: 1, businessName: 'A SAC', ruc: '20100070970' })],
      isLoading: false
    });
    render(<CompanySelectionPage />);
    expect(screen.getByText('A SAC')).toBeInTheDocument();
    expect(screen.getByText(/20100070970/)).toBeInTheDocument();
  });

  it('botón Agregar Nueva Empresa abre el flow', () => {
    useCompanyMock.mockReturnValue({ companies: [], isLoading: false });
    render(<CompanySelectionPage />);
    fireEvent.click(screen.getByText('Agregar Nueva Empresa'));
  });
});
