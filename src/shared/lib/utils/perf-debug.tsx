import { Profiler, type ReactNode } from 'react';

/**
 * Instrumentación de performance solo para DEV.
 *
 * Uso desde la consola del Web Inspector / DevTools:
 *
 *   __perfDebug.enable()        // empieza a registrar
 *   __perfDebug.reset()         // limpia buffer (úsalo justo antes de reproducir)
 *   // ... haz la acción que lagea (click, sort, abrir dialog) ...
 *   __perfDebug.flush()         // imprime resumen: long tasks, renders por componente, measures
 *   __perfDebug.disable()       // apaga
 *
 * Datos que captura:
 *  - long tasks (>50ms bloqueando main thread, vía PerformanceObserver)
 *  - renders por componente (id + count + tiempo total y promedio, vía React Profiler API)
 *  - measures con nombre (vía __perfDebug.mark / measureSync)
 *
 * No corre en producción — `import.meta.env.DEV` gatea todo el módulo.
 */

interface LongTaskEntry {
  start: number;
  duration: number;
}

interface MeasureEntry {
  name: string;
  duration: number;
  ts: number;
}

interface RenderAgg {
  count: number;
  totalActual: number;
  totalBase: number;
  maxActual: number;
}

const state = {
  enabled: false,
  observer: null as PerformanceObserver | null,
  longTasks: [] as LongTaskEntry[],
  measures: [] as MeasureEntry[],
  renders: new Map<string, RenderAgg>()
};

export function isEnabled(): boolean {
  return state.enabled;
}

export function enable(): void {
  if (state.enabled) return;
  state.enabled = true;

  try {
    state.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          state.longTasks.push({ start: entry.startTime, duration: entry.duration });
        }
      }
    });
    state.observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // WebKit no siempre soporta longtask. Igual seguimos: renders + measures funcionan.
    console.warn('[perf-debug] PerformanceObserver longtask no disponible — renders/measures sí.');
  }

  console.log('[perf-debug] habilitado. Reproduce la acción y luego __perfDebug.flush().');
}

export function disable(): void {
  if (!state.enabled) return;
  state.observer?.disconnect();
  state.observer = null;
  state.enabled = false;
  console.log('[perf-debug] deshabilitado.');
}

export function reset(): void {
  state.longTasks = [];
  state.measures = [];
  state.renders.clear();
  console.log('[perf-debug] buffer limpio.');
}

export function mark(name: string): void {
  if (!state.enabled) return;
  try {
    performance.mark(name);
  } catch {
    // ignore
  }
}

export function measureSync<T>(name: string, fn: () => T): T {
  if (!state.enabled) return fn();
  const start = performance.now();
  try {
    return fn();
  } finally {
    state.measures.push({ name, duration: performance.now() - start, ts: start });
  }
}

/**
 * Callback para `<Profiler onRender>` de React. Solo registra si está habilitado.
 * El Profiler en sí siempre se ejecuta (overhead mínimo) — la decisión de loggear vive acá.
 */
export function recordRender(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number
): void {
  if (!state.enabled) return;
  const existing = state.renders.get(id) ?? { count: 0, totalActual: 0, totalBase: 0, maxActual: 0 };
  existing.count++;
  existing.totalActual += actualDuration;
  existing.totalBase += baseDuration;
  if (actualDuration > existing.maxActual) existing.maxActual = actualDuration;
  state.renders.set(id, existing);
  // phase no se acumula porque mezclar mount+update en la misma row simplifica la lectura
  void phase;
}

export function flush(): void {
  console.group('[perf-debug] summary');

  console.log('\n• Long tasks (>50ms bloqueando main thread):');
  if (state.longTasks.length === 0) {
    console.log('  (ninguno detectado)');
  } else {
    console.table(
      state.longTasks.map((t) => ({
        'start (ms)': t.start.toFixed(1),
        'duration (ms)': t.duration.toFixed(1)
      }))
    );
    const total = state.longTasks.reduce((s, t) => s + t.duration, 0);
    console.log(`  total bloqueado: ${total.toFixed(1)} ms en ${state.longTasks.length} tareas`);
  }

  console.log('\n• Measures con nombre:');
  if (state.measures.length === 0) {
    console.log('  (ninguno)');
  } else {
    console.table(
      state.measures.map((m) => ({
        name: m.name,
        'duration (ms)': m.duration.toFixed(2),
        'ts (ms)': m.ts.toFixed(1)
      }))
    );
  }

  console.log('\n• Renders por componente (React Profiler):');
  if (state.renders.size === 0) {
    console.log('  (sin datos — ¿reproducir luego de enable+reset?)');
  } else {
    const rows = Array.from(state.renders.entries())
      .map(([id, r]) => ({
        component: id,
        renders: r.count,
        'total actual (ms)': r.totalActual.toFixed(1),
        'avg actual (ms)': (r.totalActual / r.count).toFixed(2),
        'max actual (ms)': r.maxActual.toFixed(1)
      }))
      .sort((a, b) => parseFloat(b['total actual (ms)']) - parseFloat(a['total actual (ms)']));
    console.table(rows);
  }

  console.groupEnd();
}

/**
 * Wrapper de React.Profiler que solo se monta en dev. En prod devuelve children
 * directo → cero overhead de Profiler en el árbol de React.
 *
 * Uso:
 *   <DevProfiler id="DataTable"><MyTree /></DevProfiler>
 */
export function DevProfiler({ id, children }: { id: string; children: ReactNode }) {
  if (!import.meta.env.DEV) return <>{children}</>;
  return (
    <Profiler id={id} onRender={recordRender}>
      {children}
    </Profiler>
  );
}

// Exponer en window para uso desde consola. Solo dev.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__perfDebug = {
    enable,
    disable,
    reset,
    flush,
    mark,
    measureSync,
    isEnabled
  };
}
