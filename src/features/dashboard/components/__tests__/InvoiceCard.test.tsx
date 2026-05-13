import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvoiceCard } from '../InvoiceCard';

describe('InvoiceCard', () => {
  it('renderiza badge VENTAS para sales', () => {
    render(
      <InvoiceCard
        type="sales"
        title="Libro de Ventas"
        description="x"
        recordCount={42}
        onClick={() => undefined}
      />
    );
    expect(screen.getByText('VENTAS')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renderiza badge COMPRAS para purchases', () => {
    render(<InvoiceCard type="purchases" title="x" description="x" recordCount={0} onClick={() => undefined} />);
    expect(screen.getByText('COMPRAS')).toBeInTheDocument();
  });

  it('muestra badge Declarado cuando declared=true', () => {
    render(
      <InvoiceCard type="sales" title="x" description="x" recordCount={1} declared onClick={() => undefined} />
    );
    expect(screen.getByText('Declarado')).toBeInTheDocument();
  });

  it('onClick funciona', () => {
    const onClick = vi.fn();
    render(<InvoiceCard type="sales" title="X" description="d" recordCount={0} onClick={onClick} />);
    fireEvent.click(screen.getByText('X'));
    expect(onClick).toHaveBeenCalled();
  });
});
