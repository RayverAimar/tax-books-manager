import { describe, it, expect, vi } from 'vitest';

vi.mock('@/shared/components/common/templates/InvoiceListPage', () => ({
  InvoiceListPage: (props: { title: string; type: string }) => (
    <div data-testid="ilp" data-type={props.type}>
      {props.title}
    </div>
  )
}));

import { render, screen } from '@testing-library/react';
import { Purchases } from '../Purchases';

describe('Purchases page', () => {
  it('renderiza InvoiceListPage para purchases', () => {
    render(<Purchases />);
    const el = screen.getByTestId('ilp');
    expect(el.getAttribute('data-type')).toBe('purchases');
    expect(el.textContent).toBe('Registro de Compras');
  });
});
