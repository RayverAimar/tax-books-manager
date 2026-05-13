import { describe, it, expect } from 'vitest';
import { buildSireFileName } from '../sire-filename';

describe('buildSireFileName', () => {
  it('default: RVIE reemplaza propuesta, operativa, con info, PEN', () => {
    const name = buildSireFileName({ ruc: '20123456789', period: '202401', type: 'sales' });
    // LE + 20123456789 + 2024 + 01 + 00 + 140000 + 02 (CC) + 1 (O) + 1 (I) + 1 (M) + 2 (G) + .TXT
    expect(name).toBe('LE2012345678920240100140000021112.TXT');
  });

  it('default: RCE reemplaza propuesta, operativa, con info, PEN', () => {
    const name = buildSireFileName({ ruc: '20123456789', period: '202401', type: 'purchases' });
    expect(name).toBe('LE2012345678920240100080400021112.TXT');
  });

  it('código de libro cambia según tipo (140000 vs 080400)', () => {
    const ventas = buildSireFileName({ ruc: '20000000000', period: '202412', type: 'sales' });
    const compras = buildSireFileName({ ruc: '20000000000', period: '202412', type: 'purchases' });
    expect(ventas).toContain('140000');
    expect(compras).toContain('080400');
  });

  it('opportunity 01 (acepta propuesta)', () => {
    const name = buildSireFileName({ ruc: '20123456789', period: '202401', type: 'sales', opportunity: '01' });
    // Después del libro 140000 viene "01" (CC)
    expect(name).toContain('14000001');
  });

  it('opportunity 03 (ajuste posterior) incluye correlativo', () => {
    const name = buildSireFileName({
      ruc: '20123456789',
      period: '202401',
      type: 'sales',
      opportunity: '03',
      correlative: '01'
    });
    // ... + 140000 + 031112 + 01 + .TXT
    expect(name.endsWith('01.TXT')).toBe(true);
    expect(name).toContain('14000003');
  });

  it('moneda USD usa indicador 2', () => {
    const name = buildSireFileName({ ruc: '20123456789', period: '202401', type: 'sales', currency: 'USD' });
    // Final del nombre: ... 140000 02 1 1 2 2 .TXT
    // slice(-6,-5)=M (moneda), slice(-5,-4)=G (sistema)
    expect(name.slice(-6, -5)).toBe('2'); // moneda USD
    expect(name.slice(-5, -4)).toBe('2'); // sistema (siempre 2)
  });

  it('sin info → indicador contenido 0', () => {
    const name = buildSireFileName({ ruc: '20123456789', period: '202401', type: 'sales', hasInfo: false });
    expect(name).toContain('140000021'); // libro(140000) + CC(02) + O(1)... antes del I=0
    expect(name).toContain('02101'); // CC + O + I=0 + M=1 + parte de G
  });

  it('respeta el período exacto (extrae AAAA y MM)', () => {
    const name = buildSireFileName({ ruc: '20111111111', period: '202312', type: 'purchases' });
    expect(name).toContain('20231200');
  });

  it('extensión .TXT en mayúsculas (SIRE estándar)', () => {
    const name = buildSireFileName({ ruc: '20123456789', period: '202401', type: 'sales' });
    expect(name.endsWith('.TXT')).toBe(true);
  });
});
