import { describe, it, expect, vi } from 'vitest';

vi.mock('@/shared/components/common/templates/InvoiceListPage', () => ({
  InvoiceListPage: (props: { title: string; type: string }) => (
    <div data-testid="ilp" data-type={props.type}>
      {props.title}
    </div>
  )
}));

import { render, screen } from '@testing-library/react';
import { Sales } from '../Sales';

describe('Sales page', () => {
  it('renderiza InvoiceListPage para sales con título correcto', () => {
    render(<Sales />);
    const el = screen.getByTestId('ilp');
    expect(el.getAttribute('data-type')).toBe('sales');
    expect(el.textContent).toBe('Registro de Ventas');
  });
});
