import { describe, it, expect, vi } from 'vitest';

const useCompanyMock = vi.fn();
const usePeriodMock = vi.fn();
vi.mock('@/core/presentation/contexts/company.context', () => ({
  useCompany: () => useCompanyMock()
}));
vi.mock('@/core/presentation/contexts/period.context', () => ({
  usePeriod: () => usePeriodMock()
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeclaredToggle } from '../DeclaredToggle';
import { aCompany } from '@/test/helpers/factories';

describe('DeclaredToggle', () => {
  it('retorna null si no hay periodo', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    usePeriodMock.mockReturnValue({ period: null, toggleDeclared: vi.fn() });
    const { container } = render(<DeclaredToggle type="sales" />);
    expect(container.firstChild).toBeNull();
  });

  it('refleja estado declarado de ventas', () => {
    useCompanyMock.mockReturnValue({ company: aCompany() });
    usePeriodMock.mockReturnValue({
      period: { code: '202501', salesDeclared: true, purchasesDeclared: false },
      toggleDeclared: vi.fn()
    });
    render(<DeclaredToggle type="sales" />);
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('click invoca toggleDeclared', async () => {
    const toggleDeclared = vi.fn().mockResolvedValue(undefined);
    useCompanyMock.mockReturnValue({ company: aCompany({ id: 7 }) });
    usePeriodMock.mockReturnValue({
      period: { code: '202501', salesDeclared: false, purchasesDeclared: false },
      toggleDeclared
    });
    render(<DeclaredToggle type="sales" />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(toggleDeclared).toHaveBeenCalledWith(7, 'sales'));
  });
});
