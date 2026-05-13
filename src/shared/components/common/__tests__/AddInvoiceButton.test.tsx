import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddInvoiceButton } from '../AddInvoiceButton';

function MyForm({ onSubmit }: { onSubmit: (d: { name: string }) => void }) {
  return (
    <button type="button" onClick={() => onSubmit({ name: 'X' })}>
      submit-form
    </button>
  );
}

describe('AddInvoiceButton', () => {
  it('renderiza con label y abre dialog', async () => {
    const onSubmit = vi.fn();
    render(
      <AddInvoiceButton
        label="Agregar"
        dialogTitle="Nuevo"
        dialogDescription="Descripción"
        FormComponent={MyForm}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByText('Agregar')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Agregar'));
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('submit-form')).toBeInTheDocument());
    fireEvent.click(screen.getByText('submit-form'));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'X' });
  });

  it('disabled bloquea el botón', () => {
    render(
      <AddInvoiceButton
        label="X"
        dialogTitle="t"
        dialogDescription="d"
        FormComponent={MyForm}
        onSubmit={() => undefined}
        disabled
      />
    );
    expect(screen.getByText('X').closest('button')).toBeDisabled();
  });
});
