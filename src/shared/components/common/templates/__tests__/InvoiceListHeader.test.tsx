import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvoiceListHeader } from '../InvoiceListHeader';

describe('InvoiceListHeader', () => {
  it('renderiza children', () => {
    render(
      <InvoiceListHeader>
        <span>child</span>
      </InvoiceListHeader>
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('Back dispara onBack', () => {
    const onBack = vi.fn();
    render(<InvoiceListHeader.Back onBack={onBack} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onBack).toHaveBeenCalled();
  });

  it('Title con periodo formatea YYYYMM → YYYY/MM', () => {
    render(<InvoiceListHeader.Title title="Ventas" period="202501" recordCount={42} />);
    expect(screen.getByText(/2025\/01/)).toBeInTheDocument();
    expect(screen.getByText(/42 registros/)).toBeInTheDocument();
  });

  it('Title sin periodo solo muestra título', () => {
    render(<InvoiceListHeader.Title title="Ventas" />);
    expect(screen.getByText('Ventas')).toBeInTheDocument();
  });

  it('Actions renderiza children', () => {
    render(
      <InvoiceListHeader.Actions>
        <button>action</button>
      </InvoiceListHeader.Actions>
    );
    expect(screen.getByText('action')).toBeInTheDocument();
  });

  it('Loading isLoading=false → null', () => {
    const { container } = render(<InvoiceListHeader.Loading isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('Loading isLoading=true → muestra Cargando', () => {
    render(<InvoiceListHeader.Loading isLoading />);
    expect(screen.getByText(/Cargando/)).toBeInTheDocument();
  });
});
