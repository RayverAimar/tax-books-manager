import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookTypeCard } from '../BookTypeCard';

describe('BookTypeCard', () => {
  it('renderiza título, descripción y stats', () => {
    render(
      <BookTypeCard
        type="sales"
        title="Ventas"
        description="Registro de ventas"
        icon={<span data-testid="icon">i</span>}
        stats={{ periods: 5, currentPeriod: '202501' }}
        onClick={() => undefined}
      />
    );
    expect(screen.getByText('Ventas')).toBeInTheDocument();
    expect(screen.getByText('Registro de ventas')).toBeInTheDocument();
    expect(screen.getByText('5 registros')).toBeInTheDocument();
    expect(screen.getByText('Enero 2025')).toBeInTheDocument();
  });

  it('singular cuando periods=1', () => {
    render(
      <BookTypeCard
        type="purchases"
        title="Compras"
        description="x"
        icon={<span />}
        stats={{ periods: 1, currentPeriod: '202501' }}
        onClick={() => undefined}
      />
    );
    expect(screen.getByText('1 registro')).toBeInTheDocument();
  });

  it('onClick se dispara al hacer click', () => {
    const onClick = vi.fn();
    render(<BookTypeCard type="sales" title="V" description="x" icon={<span />} onClick={onClick} />);
    fireEvent.click(screen.getByText('V'));
    expect(onClick).toHaveBeenCalled();
  });
});
