import { toast as sonnerToast } from 'sonner';

/**
 * Centralized toast utility for consistent notifications across the app
 * Single source of truth for toast configuration and styling
 */

interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

interface ToastOptions {
  description?: string;
  action?: ToastAction;
  duration?: number;
}

/**
 * Show a success toast with green styling
 * Default duration: 4 seconds
 */
export function showSuccess(message: string, options?: ToastOptions) {
  return sonnerToast.success(message, {
    description: options?.description,
    action: options?.action,
    duration: options?.duration || 4000
  });
}

/**
 * Show an error toast with red styling
 * Default duration: 10 seconds (longer for errors with instructions)
 */
export function showError(message: string, options?: ToastOptions) {
  return sonnerToast.error(message, {
    description: options?.description,
    action: options?.action,
    duration: options?.duration || 10000
  });
}

/**
 * Show an info toast with blue styling
 * Default duration: 6 seconds
 */
export function showInfo(message: string, options?: ToastOptions) {
  return sonnerToast.info(message, {
    description: options?.description,
    action: options?.action,
    duration: options?.duration || 6000
  });
}

/**
 * Show a warning toast with yellow styling
 * Default duration: 8 seconds (longer for warnings)
 */
export function showWarning(message: string, options?: ToastOptions) {
  return sonnerToast.warning(message, {
    description: options?.description,
    action: options?.action,
    duration: options?.duration || 8000
  });
}

/**
 * Show a loading toast that returns a function to dismiss it
 */
export function showLoading(message: string) {
  return sonnerToast.loading(message);
}

/**
 * Create a "Show in Folder" action for file exports
 * This is a common pattern used across PDF and ZIP exports
 */
export function createShowInFolderAction(filePath: string): ToastAction {
  return {
    label: 'Mostrar en Carpeta',
    onClick: async () => {
      try {
        const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
        await revealItemInDir(filePath);
      } catch {
        showError('No se pudo abrir la carpeta');
      }
    }
  };
}

/**
 * Show export success toast with "Show in Folder" button
 */
export function showExportSuccess(_fileName: string, filePath: string, description?: string) {
  return showSuccess('Exportación completa', {
    description: description || `Archivo guardado en: ${filePath}`,
    action: createShowInFolderAction(filePath),
    duration: 7000
  });
}

/**
 * Show export cancelled toast
 */
export function showExportCancelled() {
  return showInfo('Exportación cancelada');
}

/**
 * Show export error toast
 */
export function showExportError(error: unknown) {
  // Caso especial: SireValidationError (PVSIRE-parity).
  // Estructura: validation.rowResults = [{ row, result: { errors: [{field, code, message}] }}]
  if (error instanceof Error && error.name === 'SireValidationError') {
    type PvsireIssue = { field: string; code: number; position?: number; message: string };
    type PvsireRowResult = { row: number; result: { ok: boolean; errors: PvsireIssue[] } };
    type PvsireValidation = { totalErrors: number; rowResults: PvsireRowResult[] };
    const validation = (error as Error & { validation?: PvsireValidation }).validation;
    if (validation && validation.totalErrors > 0) {
      // Aplanar errores: tomar primeros 3 de filas con errores
      const lines: string[] = [];
      let count = 0;
      for (const { row, result } of validation.rowResults) {
        if (!result.ok) {
          for (const e of result.errors) {
            if (count >= 3) break;
            lines.push(`Fila ${row} • ${e.field} (PVSIRE ${e.code}): ${e.message}`);
            count++;
          }
        }
        if (count >= 3) break;
      }
      const more = validation.totalErrors - count;
      if (more > 0) lines.push(`...y ${more} errores más`);
      return showError(`Validación PVSIRE: ${validation.totalErrors} errores`, {
        description: lines.join('\n')
      });
    }
  }
  const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
  return showError('Error al generar el archivo', {
    description: errorMessage
  });
}
