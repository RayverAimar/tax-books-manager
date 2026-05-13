import { describe, it, expect, vi } from 'vitest';

const useCompanyMock = vi.fn();
vi.mock('@/core/presentation/contexts/company.context', () => ({ useCompany: () => useCompanyMock() }));
vi.mock('@/core/infrastructure/repositories/repository.factory', () => ({
  RepositoryFactory: {
    getPeriodRepository: () => ({ getAvailablePeriods: vi.fn().mockResolvedValue([]) }),
    getSalesRepository: () => ({ getAll: vi.fn().mockResolvedValue([]) }),
    getPurchasesRepository: () => ({ getAll: vi.fn().mockResolvedValue([]) })
  }
}));

import { render, screen } from '@testing-library/react';
import { BulkExportDialog } from '../BulkExportDialog';
import { aCompany } from '@/test/helpers/factories';

describe('BulkExportDialog (smoke)', () => {
  it('renderiza cuando está abierto', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    render(<BulkExportDialog open onOpenChange={() => undefined} />);
    expect(screen.getAllByText(/Exportar/i).length).toBeGreaterThan(0);
  });
});
