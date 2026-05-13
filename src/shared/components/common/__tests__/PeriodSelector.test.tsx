import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PeriodSelector } from '../PeriodSelector';
import { initTestDb, mockHandler } from '@/test/helpers/repo';

describe('PeriodSelector', () => {
  it('muestra Cargando inicialmente y luego renderiza el select', async () => {
    await initTestDb();
    mockHandler(() => []);
    render(<PeriodSelector companyId={1} type="sales" />);
    expect(screen.getByText(/Cargando periodos/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Periodo:')).toBeInTheDocument());
  });

  it('llama onChange con periodo válido cuando no hay value', async () => {
    await initTestDb();
    mockHandler(() => []);
    const onChange = vi.fn();
    render(<PeriodSelector companyId={1} type="sales" onChange={onChange} />);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0]).toMatch(/^\d{6}$/);
  });
});
