import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => {
  const fn = vi.fn();
  return {
    toast: Object.assign(fn, {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      loading: vi.fn()
    })
  };
});

import { toast } from 'sonner';
import {
  showSuccess,
  showError,
  showInfo,
  showWarning,
  showLoading,
  showExportSuccess,
  showExportCancelled,
  showExportError,
  createShowInFolderAction
} from '../toast';

describe('toast helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('showSuccess llama sonnerToast.success con duration por defecto', () => {
    showSuccess('ok');
    expect(toast.success).toHaveBeenCalledWith('ok', expect.objectContaining({ duration: 4000 }));
  });

  it('showError usa duración 10s', () => {
    showError('bad');
    expect(toast.error).toHaveBeenCalledWith('bad', expect.objectContaining({ duration: 10000 }));
  });

  it('showInfo y showWarning con defaults', () => {
    showInfo('info');
    expect(toast.info).toHaveBeenCalled();
    showWarning('warn');
    expect(toast.warning).toHaveBeenCalled();
  });

  it('showLoading se delega a sonnerToast.loading', () => {
    showLoading('loading...');
    expect(toast.loading).toHaveBeenCalledWith('loading...');
  });

  it('showExportSuccess adjunta acción de mostrar en carpeta', () => {
    showExportSuccess('ventas.csv', '/tmp/ventas.csv');
    expect(toast.success).toHaveBeenCalled();
    const args = (toast.success as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args[1].action).toBeDefined();
    expect(args[1].action.label).toMatch(/Carpeta/);
  });

  it('showExportCancelled emite info', () => {
    showExportCancelled();
    expect(toast.info).toHaveBeenCalled();
  });

  it('showExportError formatea Error', () => {
    showExportError(new Error('boom'));
    expect(toast.error).toHaveBeenCalledWith(
      'Error al generar el archivo',
      expect.objectContaining({ description: 'boom' })
    );
  });

  it('showExportError con valor desconocido', () => {
    showExportError('something');
    expect(toast.error).toHaveBeenCalled();
  });

  it('createShowInFolderAction onClick invoca revealItemInDir', async () => {
    const opener = await import('@tauri-apps/plugin-opener');
    const action = createShowInFolderAction('/tmp/x');
    await action.onClick();
    expect(opener.revealItemInDir).toHaveBeenCalledWith('/tmp/x');
  });
});
