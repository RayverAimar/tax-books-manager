import { describe, it, expect, vi } from 'vitest';

const useCompanyMock = vi.fn();
vi.mock('@/core/presentation/contexts/company.context', () => ({ useCompany: () => useCompanyMock() }));
vi.mock('@/core/infrastructure/repositories/repository.factory', () => ({
  RepositoryFactory: {
    getSettingsRepository: () => ({ getApiKey: vi.fn().mockResolvedValue(null), setApiKey: vi.fn() })
  }
}));

import { render, screen } from '@testing-library/react';
import { CompanySettingsDialog } from '../CompanySettingsDialog';
import { aCompany } from '@/test/helpers/factories';

describe('CompanySettingsDialog (smoke)', () => {
  it('renderiza cuando está abierto', () => {
    useCompanyMock.mockReturnValue({
      company: aCompany(),
      updateCompany: vi.fn(),
      switchCompany: vi.fn(),
      companies: [aCompany()]
    });
    render(<CompanySettingsDialog open onOpenChange={() => undefined} />);
    expect(screen.getAllByText(/Configuración/i).length).toBeGreaterThan(0);
  });
});
