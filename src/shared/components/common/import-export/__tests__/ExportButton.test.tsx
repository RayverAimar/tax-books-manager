import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExportButton } from '../ExportButton';

describe('ExportButton', () => {
  it('renderiza el botón "Exportar"', () => {
    render(<ExportButton onExport={() => undefined} isExporting={false} />);
    expect(screen.getByText('Exportar')).toBeInTheDocument();
  });

  it('deshabilitado al exportar', () => {
    render(<ExportButton onExport={() => undefined} isExporting />);
    expect(screen.getByText('Exportar').closest('button')).toBeDisabled();
  });

  it('clic en CSV dispara onExport("csv")', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} isExporting={false} />);
    await user.click(screen.getByText('Exportar'));
    await user.click(await screen.findByText('Exportar como CSV'));
    expect(onExport).toHaveBeenCalledWith('csv');
  });
});
