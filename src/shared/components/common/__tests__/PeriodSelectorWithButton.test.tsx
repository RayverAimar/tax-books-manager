import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PeriodSelectorWithButton } from '../PeriodSelectorWithButton';

describe('PeriodSelectorWithButton', () => {
  it('renderiza con valor inicial', () => {
    render(<PeriodSelectorWithButton value="202501" onChange={() => undefined} />);
    expect(screen.getByText(/Periodo/)).toBeInTheDocument();
    expect(screen.getByText(/Buscar/)).toBeInTheDocument();
  });

  it('botón Buscar deshabilitado sin cambios', () => {
    render(<PeriodSelectorWithButton value="202501" onChange={() => undefined} />);
    expect(screen.getByText('Buscar').closest('button')).toBeDisabled();
  });

  it('botón Buscar deshabilitado cuando disabled=true', () => {
    const onChange = vi.fn();
    render(<PeriodSelectorWithButton value={null} onChange={onChange} disabled />);
    expect(screen.getByText('Buscar').closest('button')).toBeDisabled();
  });
});
