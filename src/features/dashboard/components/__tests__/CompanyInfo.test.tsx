import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/presentation/contexts/company.context', () => ({
  useCompany: vi.fn()
}));
vi.mock('../CompanySettingsDialog', () => ({
  CompanySettingsDialog: () => <div data-testid="settings-dialog" />
}));

import { render, screen } from '@testing-library/react';
import { CompanyInfo } from '../CompanyInfo';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { aCompany } from '@/test/helpers/factories';

const useCompanyMock = vi.mocked(useCompany);

describe('CompanyInfo', () => {
  it('muestra Cargando cuando isLoading', () => {
    useCompanyMock.mockReturnValue({
      company: null,
      companies: [],
      isLoading: true,
      error: null,
      switchCompany: vi.fn(),
      refreshCompanies: vi.fn(),
      createCompany: vi.fn(),
      updateCompany: vi.fn()
    });
    render(<CompanyInfo />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('retorna null cuando no hay company', () => {
    useCompanyMock.mockReturnValue({
      company: null,
      companies: [],
      isLoading: false,
      error: null,
      switchCompany: vi.fn(),
      refreshCompanies: vi.fn(),
      createCompany: vi.fn(),
      updateCompany: vi.fn()
    });
    const { container } = render(<CompanyInfo />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra razón social y RUC en modo readonly', () => {
    useCompanyMock.mockReturnValue({
      company: aCompany({ businessName: 'ACME SAC', ruc: '12345678901' }),
      companies: [],
      isLoading: false,
      error: null,
      switchCompany: vi.fn(),
      refreshCompanies: vi.fn(),
      createCompany: vi.fn(),
      updateCompany: vi.fn()
    });
    render(<CompanyInfo />);
    expect(screen.getByText('ACME SAC')).toBeInTheDocument();
    expect(screen.getByText(/12345678901/)).toBeInTheDocument();
  });

  it('renderiza botones de acción cuando showActions=true', () => {
    useCompanyMock.mockReturnValue({
      company: aCompany(),
      companies: [],
      isLoading: false,
      error: null,
      switchCompany: vi.fn(),
      refreshCompanies: vi.fn(),
      createCompany: vi.fn(),
      updateCompany: vi.fn()
    });
    render(<CompanyInfo showActions />);
    expect(screen.getByTitle(/Configuración/)).toBeInTheDocument();
    expect(screen.getByTitle(/Cambiar de empresa/)).toBeInTheDocument();
  });
});
