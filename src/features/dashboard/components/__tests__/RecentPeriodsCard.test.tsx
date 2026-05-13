import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RecentPeriodsCard } from '../RecentPeriodsCard';
import { initTestDb, mockHandler } from '@/test/helpers/repo';

describe('RecentPeriodsCard', () => {
  it('muestra Cargando inicialmente, luego "no hay periodos"', async () => {
    await initTestDb();
    mockHandler(() => []);
    render(<RecentPeriodsCard companyId={1} onPeriodClick={vi.fn()} />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/No hay periodos con datos/)).toBeInTheDocument()
    );
  });
});
