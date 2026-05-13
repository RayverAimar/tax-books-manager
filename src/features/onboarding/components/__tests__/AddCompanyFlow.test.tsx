import { describe, it, expect, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
const useCompanyMock = vi.fn();
vi.mock('@/core/presentation/contexts/company.context', () => ({ useCompany: () => useCompanyMock() }));
vi.mock('@/core/infrastructure/repositories/settings.repository', () => ({
  SettingsRepository: vi.fn().mockImplementation(() => ({
    getApiKey: vi.fn().mockResolvedValue(null)
  }))
}));

import { render, screen, waitFor } from '@testing-library/react';
import { AddCompanyFlow } from '../AddCompanyFlow';

describe('AddCompanyFlow (smoke)', () => {
  it('renderiza el flow inicial', async () => {
    useCompanyMock.mockReturnValue({ createCompany: vi.fn() });
    render(<AddCompanyFlow onComplete={() => undefined} onCancel={() => undefined} />);
    await waitFor(() => expect(screen.getAllByText(/API|Key|RUC|Empresa/i).length).toBeGreaterThan(0));
  });
});
