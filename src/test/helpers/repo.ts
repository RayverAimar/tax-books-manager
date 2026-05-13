/**
 * Repository test helpers.
 *
 * Each repository ultimately calls DatabaseService.getInstance(), whose
 * underlying Database is the mock from setup.ts. To use repositories in tests:
 *
 *   1. await initTestDb()      — once per test, runs (mocked) migrations
 *   2. mockHandler(fn)         — drive SQL responses
 *   3. instantiate the repo and call methods
 */

import { DatabaseService } from '@/core/infrastructure/database/database.service';
import { mockHandler, resetMockDb } from './db';

/**
 * Initialize DatabaseService against the mock and reset every per-test state.
 * Idempotent — DatabaseService is a singleton.
 */
export async function initTestDb() {
  await resetMockDb();
  // The mock returns {} for every SQL call by default — that's enough for migrations.
  const db = DatabaseService.getInstance();
  await db.initialize();
  // After init, reset call recorders so tests see only their own activity.
  await resetMockDb();
  return db;
}

/**
 * Returns a handler that emulates a single-table in-memory store keyed by `id`.
 * Useful when a test wants `create()` + `getById()` to round-trip without
 * spelling out every SQL match.
 *
 * @example
 * mockHandler(makeTableHandler({
 *   onInsert: (params) => ({ id: nextId++, ...mapInsert(params) }),
 *   onSelectById: (id, rows) => rows.find(r => r.id === id) ?? null
 * }));
 */
export function makeIdSequencer(start = 1) {
  let n = start;
  return () => n++;
}

export { mockHandler, resetMockDb };
