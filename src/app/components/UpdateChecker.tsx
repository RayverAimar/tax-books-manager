import { useEffect, useState } from 'react';
import { Download, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

type Stage = 'idle' | 'downloading' | 'installing' | 'error';

/**
 * Chequea updates al iniciar la app. Si hay uno disponible, abre un dialog
 * con la nueva versión, las notas, y un botón de instalación que muestra
 * progreso en tiempo real.
 *
 * El check es silencioso si falla (offline, 404 en latest.json, etc.) —
 * no se muestra nada al usuario, solo se loggea en consola.
 */
export function UpdateChecker() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [u, v] = await Promise.all([check(), getVersion()]);
        if (cancelled) return;
        if (u?.available) {
          setUpdate(u);
          setCurrentVersion(v);
          setOpen(true);
        }
      } catch (err) {
        // Falla silenciosa: offline / no release publicada / endpoint caído.
        // No interrumpimos el flujo del usuario.
        console.warn('[UpdateChecker] check failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;

  const handleInstall = async () => {
    setStage('downloading');
    setError(null);
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          setProgress({ downloaded: 0, total: event.data.contentLength ?? 0 });
        } else if (event.event === 'Progress') {
          setProgress((prev) => ({
            ...prev,
            downloaded: prev.downloaded + event.data.chunkLength
          }));
        } else if (event.event === 'Finished') {
          setStage('installing');
        }
      });
      // El relaunch cierra y reabre el proceso — UI no continúa después.
      await relaunch();
    } catch (err) {
      setStage('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLater = () => {
    setOpen(false);
  };

  const progressPct = progress.total > 0 ? Math.round((progress.downloaded / progress.total) * 100) : 0;
  const downloadedMB = (progress.downloaded / 1_048_576).toFixed(1);
  const totalMB = progress.total > 0 ? (progress.total / 1_048_576).toFixed(1) : '?';

  return (
    <Dialog open={open} onOpenChange={stage === 'idle' ? setOpen : undefined}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => stage !== 'idle' && e.preventDefault()}>
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>Nueva versión disponible</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">
              v{currentVersion} → <span className="font-semibold text-primary">v{update.version}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {update.body && (
          <div className="my-2 max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3">
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">{update.body}</p>
          </div>
        )}

        {stage === 'downloading' && (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-150 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                Descargando…
              </span>
              <span className="font-mono">
                {downloadedMB} / {totalMB} MB ({progressPct}%)
              </span>
            </div>
          </div>
        )}

        {stage === 'installing' && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Instalando actualización y reiniciando…</AlertDescription>
          </Alert>
        )}

        {stage === 'error' && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">No se pudo actualizar</p>
              <p className="mt-1 text-xs opacity-90">{error}</p>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {stage === 'idle' && (
            <>
              <Button type="button" variant="outline" onClick={handleLater}>
                Más tarde
              </Button>
              <Button type="button" onClick={handleInstall}>
                <Download className="mr-2 h-4 w-4" />
                Actualizar ahora
              </Button>
            </>
          )}
          {stage === 'error' && (
            <>
              <Button type="button" variant="outline" onClick={handleLater}>
                Cerrar
              </Button>
              <Button type="button" onClick={handleInstall}>
                Reintentar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
