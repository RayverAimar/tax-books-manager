import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepository } from '../settings.repository';
import { initTestDb, mockHandler } from '@/test/helpers/repo';
import { getExecuteCalls } from '@/test/helpers/db';

describe('SettingsRepository', () => {
  let repo: SettingsRepository;

  beforeEach(async () => {
    await initTestDb();
    repo = new SettingsRepository();
  });

  it('get devuelve null cuando no hay valor', async () => {
    mockHandler(() => []);
    expect(await repo.get('foo')).toBeNull();
  });

  it('get devuelve el valor cuando existe', async () => {
    mockHandler(() => [{ value: 'abc' }]);
    expect(await repo.get('foo')).toBe('abc');
  });

  it('set ejecuta INSERT OR REPLACE', async () => {
    mockHandler(() => ({ rowsAffected: 1 }));
    await repo.set('key', 'value');
    const calls = getExecuteCalls();
    expect(calls.some((c) => /INSERT OR REPLACE/.test(c.sql))).toBe(true);
  });

  it('delete elimina por key', async () => {
    mockHandler(() => ({ rowsAffected: 1 }));
    await repo.delete('k');
    expect(getExecuteCalls().some((c) => /DELETE FROM app_settings/.test(c.sql))).toBe(true);
  });

  it('getAll mapea filas a objeto plano', async () => {
    mockHandler(() => [
      { key: 'a', value: '1' },
      { key: 'b', value: '2' }
    ]);
    expect(await repo.getAll()).toEqual({ a: '1', b: '2' });
  });

  it('getApiKey descifra el valor guardado por setApiKey (round-trip)', async () => {
    // Stub DB con storage simple: el setApiKey guarda ciphertext, getApiKey lo lee.
    let stored: string | null = null;
    mockHandler((sql, params) => {
      if (/INSERT OR REPLACE/.test(sql)) {
        stored = params[1] as string;
        return { rowsAffected: 1 };
      }
      if (/SELECT value FROM app_settings/.test(sql)) {
        return stored !== null ? [{ value: stored }] : [];
      }
      return [];
    });
    await repo.setApiKey('mySecretKey');
    expect(await repo.getApiKey()).toBe('mySecretKey');
  });

  it('setApiKey rechaza valores vacíos', async () => {
    await expect(repo.setApiKey('')).rejects.toThrow();
    await expect(repo.setApiKey('   ')).rejects.toThrow();
  });

  it('setApiKey cifra el valor antes de persistirlo (no plaintext en DB)', async () => {
    mockHandler(() => ({ rowsAffected: 1 }));
    await repo.setApiKey('  abc  ');
    const calls = getExecuteCalls();
    const setCall = calls.find((c) => /INSERT OR REPLACE/.test(c.sql));
    const persisted = setCall?.params[1] as string;
    expect(persisted).toMatch(/^enc:v1:/);
    expect(persisted).not.toContain('abc');
  });
});
