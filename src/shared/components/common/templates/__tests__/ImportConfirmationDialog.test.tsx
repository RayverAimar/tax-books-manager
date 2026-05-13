import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportConfirmationDialog } from '../ImportConfirmationDialog';

describe('ImportConfirmationDialog', () => {
  it('muestra counts cuando hay existentes', () => {
    render(
      <ImportConfirmationDialog
        isOpen
        onClose={() => undefined}
        onConfirm={() => undefined}
        existingCount={10}
        newCount={5}
        type="sales"
      />
    );
    expect(screen.getByText(/Registros existentes:/)).toBeInTheDocument();
    expect(screen.getByText('Reemplazar Todo (5 Registros)')).toBeInTheDocument();
  });

  it('botones disparan acciones correctas', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ImportConfirmationDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        existingCount={5}
        newCount={3}
        type="purchases"
      />
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onConfirm).toHaveBeenCalledWith('cancel');
    fireEvent.click(screen.getByText('Agregar 3 Registros'));
    expect(onConfirm).toHaveBeenCalledWith('append');
    fireEvent.click(screen.getByText('Reemplazar Todo (3 Registros)'));
    expect(onConfirm).toHaveBeenCalledWith('replace');
  });

  it('no muestra warning cuando existingCount es 0', () => {
    render(
      <ImportConfirmationDialog
        isOpen
        onClose={() => undefined}
        onConfirm={() => undefined}
        existingCount={0}
        newCount={5}
        type="sales"
      />
    );
    expect(screen.queryByText(/no se puede deshacer/)).not.toBeInTheDocument();
  });
});
