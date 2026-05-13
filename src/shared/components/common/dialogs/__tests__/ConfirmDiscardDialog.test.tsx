import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDiscardDialog } from '../ConfirmDiscardDialog';

describe('ConfirmDiscardDialog', () => {
  it('renderiza singular vs plural', () => {
    const { rerender } = render(
      <ConfirmDiscardDialog
        isOpen
        onOpenChange={() => undefined}
        selectedCount={1}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(screen.getByText(/1 registro\./)).toBeInTheDocument();
    rerender(
      <ConfirmDiscardDialog
        isOpen
        onOpenChange={() => undefined}
        selectedCount={3}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(screen.getByText(/3 registros\./)).toBeInTheDocument();
  });

  it('callbacks se disparan', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDiscardDialog
        isOpen
        onOpenChange={() => undefined}
        selectedCount={1}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Sí, eliminar'));
    expect(onConfirm).toHaveBeenCalled();
  });
});
