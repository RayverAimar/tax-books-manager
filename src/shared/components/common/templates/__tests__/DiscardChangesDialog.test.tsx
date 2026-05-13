import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiscardChangesDialog } from '../DiscardChangesDialog';

const summary = { total: 5, added: 2, modified: 2, deleted: 1 };

describe('DiscardChangesDialog', () => {
  it('renderiza summary cuando está abierto', () => {
    render(
      <DiscardChangesDialog
        isOpen
        onOpenChange={() => undefined}
        changesSummary={summary}
        onDiscard={() => undefined}
        onSave={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(screen.getByText(/5 cambios/)).toBeInTheDocument();
    expect(screen.getByText(/2 agregados/)).toBeInTheDocument();
  });

  it('los botones invocan callbacks', () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    const onCancel = vi.fn();
    render(
      <DiscardChangesDialog
        isOpen
        onOpenChange={() => undefined}
        changesSummary={summary}
        onSave={onSave}
        onDiscard={onDiscard}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Descartar'));
    expect(onDiscard).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Guardar'));
    expect(onSave).toHaveBeenCalled();
  });
});
