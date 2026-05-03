import React, { memo } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { AutoSaveStatus } from '../hooks/useAutoSave';
import { formatTimeAgo } from '../hooks/useAutoSave';

/**
 * Save Indicator Props
 */
interface SaveIndicatorProps {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  onSaveNow?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Save Indicator Component
 * Shows the current save status with visual feedback
 * Optimized for performance with memo
 */
export const SaveIndicator = memo<SaveIndicatorProps>(
  ({ status, lastSaved, onSaveNow, className, compact = false }) => {
    // Don't render anything in compact mode if saved
    if (compact && status === 'saved') {
      return null;
    }

    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm transition-opacity duration-200',
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={`Estado de guardado: ${status}`}
      >
        {/* Saved state */}
        {status === 'saved' && (
          <>
            <CheckCircle2
              className="h-4 w-4 text-green-600 dark:text-green-400"
              aria-hidden="true"
            />
            {!compact && (
              <span className="text-muted-foreground">
                Todos los cambios guardados
                {lastSaved && (
                  <span className="ml-1 text-xs">
                    ({formatTimeAgo(lastSaved)})
                  </span>
                )}
              </span>
            )}
          </>
        )}

        {/* Saving state */}
        {status === 'saving' && (
          <>
            <Loader2
              className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            {!compact && (
              <span className="text-blue-600 dark:text-blue-400">
                Guardando...
              </span>
            )}
          </>
        )}

        {/* Unsaved state */}
        {status === 'unsaved' && (
          <>
            <AlertCircle
              className="h-4 w-4 text-orange-600 dark:text-orange-400"
              aria-hidden="true"
            />
            <span className="text-orange-600 dark:text-orange-400">
              Cambios sin guardar
            </span>
            {onSaveNow && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSaveNow}
                className="ml-2 h-7 px-2"
                aria-label="Guardar ahora"
              >
                <Save className="mr-1 h-3.5 w-3.5" />
                Guardar
              </Button>
            )}
          </>
        )}

        {/* Error state */}
        {status === 'error' && (
          <>
            <AlertCircle
              className="h-4 w-4 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
            <span className="text-red-600 dark:text-red-400">
              Error al guardar
            </span>
            {onSaveNow && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSaveNow}
                className="ml-2 h-7 px-2 border-red-300"
                aria-label="Reintentar guardado"
              >
                <Save className="mr-1 h-3.5 w-3.5" />
                Reintentar
              </Button>
            )}
          </>
        )}
      </div>
    );
  }
);

SaveIndicator.displayName = 'SaveIndicator';

/**
 * Animated Save Indicator
 * Shows save status with animated transitions
 */
export const AnimatedSaveIndicator = memo<SaveIndicatorProps>((props) => {
  return (
    <div
      className={cn(
        'transition-all duration-300 ease-in-out',
        props.status === 'saved' && 'opacity-60 hover:opacity-100',
        props.status === 'saving' && 'animate-pulse',
        props.status === 'unsaved' && 'animate-bounce-subtle',
        props.status === 'error' && 'animate-shake-subtle'
      )}
    >
      <SaveIndicator {...props} />
    </div>
  );
});

AnimatedSaveIndicator.displayName = 'AnimatedSaveIndicator';