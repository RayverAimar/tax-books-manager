import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImportButton } from '../ImportButton';

describe('ImportButton', () => {
  it('texto cambia mientras importa', () => {
    render(<ImportButton onImport={() => undefined} isImporting={true} progress={42} />);
    expect(screen.getByText('Importando... 42%')).toBeInTheDocument();
  });

  it('botón habilitado por defecto', () => {
    render(<ImportButton onImport={() => undefined} isImporting={false} />);
    expect(screen.getByText('Importar').closest('button')).not.toBeDisabled();
  });

  it('disabled prop deshabilita', () => {
    render(<ImportButton onImport={() => undefined} isImporting={false} disabled />);
    expect(screen.getByText('Importar').closest('button')).toBeDisabled();
  });

  it('al abrir el menú dispara callbacks csv/txt', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    const onImport = vi.fn();
    render(<ImportButton onImport={onImport} isImporting={false} />);
    await user.click(screen.getByText('Importar'));
    await user.click(await screen.findByText('Importar CSV'));
    expect(onImport).toHaveBeenCalledWith('csv');
  });
});
