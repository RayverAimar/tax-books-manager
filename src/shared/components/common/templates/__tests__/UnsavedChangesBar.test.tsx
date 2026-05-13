import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnsavedChangesBar } from '../UnsavedChangesBar';

describe('UnsavedChangesBar', () => {
  it('muestra count y botones', () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    render(<UnsavedChangesBar changeCount={3} onSave={onSave} onDiscard={onDiscard} />);
    expect(screen.getByText(/3 cambios/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Guardar'));
    expect(onSave).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Descartar'));
    expect(onDiscard).toHaveBeenCalled();
  });

  it('isSaving deshabilita los botones', () => {
    render(<UnsavedChangesBar changeCount={1} onSave={() => undefined} onDiscard={() => undefined} isSaving />);
    expect(screen.getByText('Guardar').closest('button')).toBeDisabled();
    expect(screen.getByText('Descartar').closest('button')).toBeDisabled();
  });
});
