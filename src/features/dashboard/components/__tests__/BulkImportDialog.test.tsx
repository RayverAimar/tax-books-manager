import { describe, it, expect, vi } from 'vitest';

const useCompanyMock = vi.fn();
vi.mock('@/core/presentation/contexts/company.context', () => ({ useCompany: () => useCompanyMock() }));

import { render, screen } from '@testing-library/react';
import { BulkImportDialog } from '../BulkImportDialog';
import { aCompany } from '@/test/helpers/factories';

describe('BulkImportDialog (smoke)', () => {
  it('renderiza cuando está abierto', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    render(<BulkImportDialog open onOpenChange={() => undefined} />);
    expect(screen.getByText(/Importar Datos/i)).toBeInTheDocument();
  });

  it('no renderiza cuando está cerrado', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    const { container } = render(<BulkImportDialog open={false} onOpenChange={() => undefined} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
