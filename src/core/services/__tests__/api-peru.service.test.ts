import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiPeruService } from '../api-peru.service';
import { invoke } from '@tauri-apps/api/core';

describe('ApiPeruService', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  describe('queryRuc', () => {
    it('rechaza con apiKey vacío', async () => {
      await expect(ApiPeruService.queryRuc('20100070970', '')).rejects.toThrow(/API Key/);
      await expect(ApiPeruService.queryRuc('20100070970', '   ')).rejects.toThrow(/API Key/);
    });

    it('invoca tauri con ruc y apiKey trimmeado', async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ ruc: '20100070970', razon_social: 'ACME' });
      const out = await ApiPeruService.queryRuc('20100070970', '  KEY  ');
      expect(invoke).toHaveBeenCalledWith('query_ruc', { ruc: '20100070970', apiKey: 'KEY' });
      expect(out.razon_social).toBe('ACME');
    });

    it('traduce error como string', async () => {
      vi.mocked(invoke).mockRejectedValueOnce('rate limit exceeded');
      await expect(ApiPeruService.queryRuc('20100070970', 'k')).rejects.toThrow(/rate limit/);
    });

    it('traduce error genérico', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('network'));
      await expect(ApiPeruService.queryRuc('20100070970', 'k')).rejects.toThrow(/Error al consultar RUC/);
    });
  });

  describe('queryDni', () => {
    it('rechaza con apiKey vacío', async () => {
      await expect(ApiPeruService.queryDni('12345678', '')).rejects.toThrow();
    });

    it('invoca tauri con dni', async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ dni: '12345678', cliente: 'JUAN' });
      const out = await ApiPeruService.queryDni('12345678', 'k');
      expect(out.cliente).toBe('JUAN');
    });
  });

  describe('isValidRuc / isValidDni', () => {
    it('valida RUC con dígito verificador (módulo 11)', () => {
      expect(ApiPeruService.isValidRuc('20131312955')).toBe(true); // SUNAT real, válido
      expect(ApiPeruService.isValidRuc('12345678901')).toBe(false); // 11 dígitos pero mod-11 falla
      expect(ApiPeruService.isValidRuc('123')).toBe(false);
      expect(ApiPeruService.isValidRuc('1234567890A')).toBe(false);
    });

    it('valida DNI de 8 dígitos', () => {
      expect(ApiPeruService.isValidDni('12345678')).toBe(true);
      expect(ApiPeruService.isValidDni('1234567')).toBe(false);
    });
  });
});
