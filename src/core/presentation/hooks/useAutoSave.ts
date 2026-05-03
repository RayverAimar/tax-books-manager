import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/shared/hooks/useToast';

/**
 * Auto-save status
 */
export type AutoSaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

/**
 * Auto-save hook options
 */
interface UseAutoSaveOptions {
  /**
   * Interval in milliseconds (default: 30000 - 30 seconds)
   */
  interval?: number;
  /**
   * Enable debouncing to prevent excessive saves
   */
  debounce?: boolean;
  /**
   * Debounce delay in milliseconds (default: 1000)
   */
  debounceDelay?: number;
  /**
   * Show toast notifications
   */
  showNotifications?: boolean;
  /**
   * Custom comparison function
   */
  isEqual?: (a: any, b: any) => boolean;
}

/**
 * Auto-save hook return type
 */
interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  saveNow: () => Promise<void>;
  hasUnsavedChanges: boolean;
  error: Error | null;
}

/**
 * Simple deep equality check for performance
 */
const simpleDeepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!simpleDeepEqual(a[key], b[key])) return false;
  }

  return true;
};

/**
 * Hook for auto-saving data with optimizations for low-spec machines
 *
 * @param data - The data to watch for changes
 * @param saveFunction - Async function to save the data
 * @param options - Configuration options
 * @returns Auto-save state and controls
 */
export const useAutoSave = <T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn => {
  const {
    interval = 30000, // 30 seconds default
    debounce = true,
    debounceDelay = 1000,
    showNotifications = false,
    isEqual = simpleDeepEqual
  } = options;

  const { toast } = useToast();

  // State
  const [status, setStatus] = useState<AutoSaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs for performance and to prevent stale closures
  const previousDataRef = useRef<T>(data);
  const dataRef = useRef<T>(data);
  const saveFunctionRef = useRef<(data: T) => Promise<void>>(saveFunction);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const mountedRef = useRef(true);

  // SECURITY: Keep refs in sync with props to prevent stale closures
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    saveFunctionRef.current = saveFunction;
  }, [saveFunction]);

  /**
   * Check if data has changed
   */
  const hasDataChanged = useCallback((): boolean => {
    return !isEqual(dataRef.current, previousDataRef.current);
  }, [isEqual]);

  /**
   * Perform save operation
   * Uses refs to avoid stale closures when called from timeouts
   */
  const performSave = useCallback(async () => {
    if (isSavingRef.current || !mountedRef.current) return;
    if (!hasDataChanged()) {
      setStatus('saved');
      return;
    }

    isSavingRef.current = true;
    setStatus('saving');
    setError(null);

    try {
      // SECURITY: Use refs to get current values, not stale closure values
      await saveFunctionRef.current(dataRef.current);

      if (!mountedRef.current) return;

      previousDataRef.current = dataRef.current;
      setStatus('saved');
      setLastSaved(new Date());

      if (showNotifications) {
        toast({
          title: 'Guardado automático',
          description: 'Los cambios se han guardado correctamente',
          variant: 'success',
          duration: 2000
        });
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const errorObj = err instanceof Error ? err : new Error('Error al guardar');
      setError(errorObj);
      setStatus('error');

      if (showNotifications) {
        toast({
          title: 'Error al guardar',
          description: 'No se pudieron guardar los cambios. Se reintentará automáticamente.',
          variant: 'destructive',
          duration: 5000
        });
      }

    } finally {
      isSavingRef.current = false;
    }
  }, [hasDataChanged, showNotifications, toast]);

  /**
   * Save now - manual trigger
   */
  const saveNow = useCallback(async () => {
    // Clear any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    await performSave();
  }, [performSave]);

  /**
   * Detect changes and mark as unsaved
   */
  useEffect(() => {
    if (hasDataChanged() && status === 'saved') {
      setStatus('unsaved');
    }
  }, [data, hasDataChanged, status]);

  /**
   * Auto-save timer with debouncing
   */
  useEffect(() => {
    if (status !== 'unsaved') return;

    const scheduleSave = () => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule new save
      saveTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          performSave();
        }
      }, interval);
    };

    if (debounce) {
      // Clear existing debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce the save scheduling
      debounceTimeoutRef.current = setTimeout(() => {
        scheduleSave();
      }, debounceDelay);
    } else {
      scheduleSave();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [status, interval, debounce, debounceDelay, performSave]);

  /**
   * Save on unmount if needed
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;

      // Clear timeouts
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle page unload - warn if unsaved changes
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'unsaved' || status === 'saving') {
        e.preventDefault();
        e.returnValue = '¿Deseas guardar los cambios antes de salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  /**
   * Visibility change - save when tab becomes hidden
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && status === 'unsaved') {
        performSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, performSave]);

  return {
    status,
    lastSaved,
    saveNow,
    hasUnsavedChanges: status === 'unsaved',
    error
  };
};

/**
 * Format time ago for display
 */
export const formatTimeAgo = (date: Date | null): string => {
  if (!date) return '';

  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'hace unos segundos';
  if (seconds < 120) return 'hace un minuto';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} minutos`;
  if (seconds < 7200) return 'hace una hora';
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`;

  return date.toLocaleDateString();
};