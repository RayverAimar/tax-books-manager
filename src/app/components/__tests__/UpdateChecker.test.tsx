import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UpdateChecker } from '../UpdateChecker';
import * as updater from '@tauri-apps/plugin-updater';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UpdateChecker', () => {
  it('no muestra nada cuando no hay update disponible', async () => {
    vi.mocked(updater.check).mockResolvedValueOnce(null);
    const { container } = render(<UpdateChecker />);
    await waitFor(() => expect(updater.check).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('no muestra nada si check() lanza error (offline / 404)', async () => {
    vi.mocked(updater.check).mockRejectedValueOnce(new Error('Network error'));
    const { container } = render(<UpdateChecker />);
    await waitFor(() => expect(updater.check).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('muestra dialog con versión nueva cuando hay update', async () => {
    vi.mocked(updater.check).mockResolvedValueOnce({
      available: true,
      version: '0.2.0',
      currentVersion: '0.1.0',
      body: 'Fix sort lag, add cell-by-cell SIRE validation',
      date: '2026-05-13',
      downloadAndInstall: vi.fn(),
      download: vi.fn(),
      install: vi.fn(),
      close: vi.fn()
    } as unknown as updater.Update);

    render(<UpdateChecker />);
    await waitFor(() => expect(screen.getByText('Nueva versión disponible')).toBeInTheDocument());
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument();
    expect(screen.getByText(/v0\.2\.0/)).toBeInTheDocument();
    // No mostramos el body / changelog — diseñado para usuarios finales.
    expect(screen.getByText(/se actualizará automáticamente/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /actualizar ahora/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /más tarde/i })).toBeInTheDocument();
  });

  it('cierra al hacer click en "Más tarde"', async () => {
    vi.mocked(updater.check).mockResolvedValueOnce({
      available: true,
      version: '0.2.0',
      currentVersion: '0.1.0',
      body: '',
      date: '2026-05-13',
      downloadAndInstall: vi.fn(),
      download: vi.fn(),
      install: vi.fn(),
      close: vi.fn()
    } as unknown as updater.Update);

    render(<UpdateChecker />);
    await waitFor(() => expect(screen.getByText('Nueva versión disponible')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /más tarde/i }));
    await waitFor(() => expect(screen.queryByText('Nueva versión disponible')).not.toBeInTheDocument());
  });
});
