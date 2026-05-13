import { describe, it, expect, beforeEach } from 'vitest';
import { RepositoryFactory } from '../repository.factory';

describe('RepositoryFactory', () => {
  beforeEach(() => {
    RepositoryFactory.setMode('local');
    RepositoryFactory.clearCache();
  });

  it('devuelve la misma instancia (singleton)', () => {
    const a = RepositoryFactory.getCompanyRepository();
    const b = RepositoryFactory.getCompanyRepository();
    expect(a).toBe(b);
  });

  it('clearCache produce nuevas instancias', () => {
    const a = RepositoryFactory.getCompanyRepository();
    RepositoryFactory.clearCache();
    const b = RepositoryFactory.getCompanyRepository();
    expect(a).not.toBe(b);
  });

  it('setMode("api") requiere apiBaseUrl', () => {
    expect(() => RepositoryFactory.setMode('api')).toThrow();
  });

  it('setMode("api") con apiBaseUrl no implementado lanza al obtener', () => {
    RepositoryFactory.setMode('api', 'http://example.com');
    expect(() => RepositoryFactory.getCompanyRepository()).toThrow(/not implemented/);
    expect(() => RepositoryFactory.getSalesRepository()).toThrow(/not implemented/);
    expect(() => RepositoryFactory.getPurchasesRepository()).toThrow(/not implemented/);
    expect(() => RepositoryFactory.getAnalyticsRepository()).toThrow(/not implemented/);
    expect(() => RepositoryFactory.getPeriodRepository()).toThrow(/not implemented/);
    expect(() => RepositoryFactory.getSettingsRepository()).toThrow(/not implemented/);
  });

  it('getMode refleja el modo activo', () => {
    expect(RepositoryFactory.getMode()).toBe('local');
  });

  it('todas las factory functions devuelven instancias en modo local', () => {
    expect(RepositoryFactory.getSalesRepository()).toBeDefined();
    expect(RepositoryFactory.getPurchasesRepository()).toBeDefined();
    expect(RepositoryFactory.getPeriodRepository()).toBeDefined();
    expect(RepositoryFactory.getAnalyticsRepository()).toBeDefined();
    expect(RepositoryFactory.getSettingsRepository()).toBeDefined();
  });
});
