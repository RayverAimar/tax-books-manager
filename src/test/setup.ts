import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { __dbMockInternals } from './helpers/db';

// =====================================================================
// Tauri Plugin SQL — every test routes through ./helpers/db state.
// =====================================================================
vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: vi.fn(async () => ({
      execute: vi.fn(async (sql: string, params: unknown[] = []) => __dbMockInternals.onExecute(sql, params)),
      select: vi.fn(async (sql: string, params: unknown[] = []) => __dbMockInternals.onSelect(sql, params)),
      close: vi.fn(async () => true)
    }))
  }
}));

// =====================================================================
// Other Tauri plugins — neutral stubs.
// =====================================================================
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => null),
  convertFileSrc: (p: string) => p
}));

vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(async () => undefined),
  listen: vi.fn(async () => () => undefined),
  once: vi.fn(async () => () => undefined)
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(async () => null),
  save: vi.fn(async () => null),
  message: vi.fn(async () => undefined),
  ask: vi.fn(async () => true),
  confirm: vi.fn(async () => true)
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(async () => ''),
  writeTextFile: vi.fn(async () => undefined),
  readFile: vi.fn(async () => new Uint8Array()),
  writeFile: vi.fn(async () => undefined),
  exists: vi.fn(async () => true),
  mkdir: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined)
}));

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(async () => new Response('{}'))
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openPath: vi.fn(async () => undefined),
  openUrl: vi.fn(async () => undefined),
  revealItemInDir: vi.fn(async () => undefined)
}));

vi.mock('@tauri-apps/plugin-process', () => ({
  exit: vi.fn(async () => undefined),
  relaunch: vi.fn(async () => undefined)
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(async () => undefined)
}));

vi.mock('@tauri-apps/plugin-store', () => {
  // Stub en memoria del KV store. Cada `load(file)` devuelve la misma instancia
  // dentro de un mismo test (suficiente para los flows de secret-storage).
  const stores = new Map<string, Map<string, unknown>>();
  return {
    load: vi.fn(async (file: string) => {
      if (!stores.has(file)) stores.set(file, new Map());
      const data = stores.get(file)!;
      return {
        get: vi.fn(async (k: string) => data.get(k)),
        set: vi.fn(async (k: string, v: unknown) => {
          data.set(k, v);
        }),
        delete: vi.fn(async (k: string) => data.delete(k)),
        save: vi.fn(async () => undefined),
        clear: vi.fn(async () => data.clear()),
        keys: vi.fn(async () => Array.from(data.keys()))
      };
    })
  };
});

// =====================================================================
// Silence the logger's stderr in tests (production code uses console).
// =====================================================================
const originalError = console.error;
const originalWarn = console.warn;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith('[ERROR]')) return;
  originalError(...(args as []));
};
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith('[WARN]')) return;
  originalWarn(...(args as []));
};
