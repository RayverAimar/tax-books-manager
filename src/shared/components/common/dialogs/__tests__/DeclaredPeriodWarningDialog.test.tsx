import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeclaredPeriodWarningDialog } from '../DeclaredPeriodWarningDialog';

describe('DeclaredPeriodWarningDialog', () => {
  it('muestra el periodo formateado', () => {
    render(
      <DeclaredPeriodWarningDialog
        open
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
        periodCode="202501"
        operationType="import"
      />
    );
    expect(screen.getByText(/Enero 2025/)).toBeInTheDocument();
  });

  it('muestra etiqueta correcta por operationType', () => {
    const { rerender } = render(
      <DeclaredPeriodWarningDialog
        open
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
        periodCode="202501"
        operationType="import"
      />
    );
    expect(screen.getByText(/importar datos/)).toBeInTheDocument();
    rerender(
      <DeclaredPeriodWarningDialog
        open
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
        periodCode="202501"
        operationType="edit"
      />
    );
    expect(screen.getByText(/editar un registro/)).toBeInTheDocument();
    rerender(
      <DeclaredPeriodWarningDialog
        open
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
        periodCode="202501"
        operationType="delete"
      />
    );
    expect(screen.getByText(/eliminar un registro/)).toBeInTheDocument();
  });

  it('botón Continuar dispara onConfirm', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <DeclaredPeriodWarningDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        periodCode="202501"
        operationType="import"
      />
    );
    fireEvent.click(screen.getByText(/Continuar/));
    expect(onConfirm).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
