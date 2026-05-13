import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyStateView } from '../EmptyStateView';

describe('EmptyStateView', () => {
  it('loading muestra spinner', () => {
    render(<EmptyStateView type="loading" />);
    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
  });

  it('no-company muestra mensaje y opcionalmente botón', () => {
    const onNav = vi.fn();
    render(<EmptyStateView type="no-company" onNavigateHome={onNav} />);
    expect(screen.getByText('No hay empresa registrada')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Volver al Dashboard'));
    expect(onNav).toHaveBeenCalled();
  });

  it('no-company sin onNavigateHome no muestra botón', () => {
    render(<EmptyStateView type="no-company" />);
    expect(screen.queryByText('Volver al Dashboard')).not.toBeInTheDocument();
  });

  it('no-period muestra mensaje correspondiente', () => {
    render(<EmptyStateView type="no-period" />);
    expect(screen.getByText('Selecciona un periodo')).toBeInTheDocument();
  });
});
