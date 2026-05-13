/**
 * DB mock helpers.
 *
 * The actual `Database.load()` mock lives in `src/test/setup.ts` and routes
 * every `db.execute()` / `db.select()` through a swappable handler kept in
 * module-private state. This file exposes a clean API for tests to drive it.
 *
 * Two strategies are supported:
 *
 * 1. **Handler-based (preferred for repository tests)** — install a function
 *    that inspects `sql` + `params` and returns rows or write results. This
 *    lets a single handler emulate INSERT, SELECT, UPDATE, DELETE for an
 *    in-memory table.
 *
 * 2. **Row queueing (preferred for analytics / single-query helpers)** — push
 *    a fixed sequence of result sets to be returned on each `select()` call.
 */

import { vi } from 'vitest';

type WriteResult = { lastInsertId?: number; rowsAffected?: number };
type Row = Record<string, unknown>;
type QueryHandler = (sql: string, params: unknown[]) => Row[] | WriteResult;

interface MockState {
  handler?: QueryHandler;
  queuedSelects: Row[][];
  queuedWrites: WriteResult[];
  executeCalls: Array<{ sql: string; params: unknown[] }>;
  selectCalls: Array<{ sql: string; params: unknown[] }>;
}

const state: MockState = {
  queuedSelects: [],
  queuedWrites: [],
  executeCalls: [],
  selectCalls: []
};

function reset() {
  state.handler = undefined;
  state.queuedSelects = [];
  state.queuedWrites = [];
  state.executeCalls = [];
  state.selectCalls = [];
}

/**
 * Returns the singleton mock and resets it. Call in `beforeEach`.
 */
export async function resetMockDb() {
  reset();
  // Touch the module so `Database.load()` returns the same mock instance.
  await import('@tauri-apps/plugin-sql');
}

/**
 * Install a handler that decides how every query is answered.
 * Return an array → treated as SELECT rows. Return an object → treated as write result.
 */
export function mockHandler(fn: QueryHandler) {
  state.handler = fn;
}

/**
 * Queue a set of rows to be returned by the next `select()` call.
 * Useful when the production code calls `select()` once and you don't care about SQL shape.
 */
export function queueMockRows(rows: Row[]) {
  state.queuedSelects.push(rows);
}

/**
 * Queue a write result (lastInsertId / rowsAffected) for the next `execute()` call.
 */
export function queueMockWrite(result: WriteResult) {
  state.queuedWrites.push(result);
}

export function getExecuteCalls() {
  return state.executeCalls;
}

export function getSelectCalls() {
  return state.selectCalls;
}

/**
 * Internal hooks used by the global mock setup. Not for direct test use.
 */
export const __dbMockInternals = {
  onSelect(sql: string, params: unknown[]): Row[] {
    state.selectCalls.push({ sql, params });
    if (state.handler) {
      const out = state.handler(sql, params);
      return Array.isArray(out) ? out : [];
    }
    return state.queuedSelects.shift() ?? [];
  },
  onExecute(sql: string, params: unknown[]): WriteResult {
    state.executeCalls.push({ sql, params });
    if (state.handler) {
      const out = state.handler(sql, params);
      return Array.isArray(out) ? { lastInsertId: 0, rowsAffected: 0 } : out;
    }
    return state.queuedWrites.shift() ?? { lastInsertId: 0, rowsAffected: 1 };
  }
};

/**
 * Replace the global default mock from `setup.ts` with one that routes through this module.
 * Tests usually do not need to call this directly; `resetMockDb()` covers it.
 */
export function installDbMock() {
  vi.doMock('@tauri-apps/plugin-sql', () => ({
    default: {
      load: vi.fn(async () => ({
        execute: vi.fn(async (sql: string, params: unknown[] = []) => __dbMockInternals.onExecute(sql, params)),
        select: vi.fn(async (sql: string, params: unknown[] = []) => __dbMockInternals.onSelect(sql, params)),
        close: vi.fn(async () => true)
      }))
    }
  }));
}
