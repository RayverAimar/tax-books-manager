import { describe, it, expect } from 'vitest';
import { decodeFileBytes } from '../encoding';

const utf8 = (s: string) => new TextEncoder().encode(s);

function cp1252(s: string): Uint8Array {
  const map: Record<string, number> = {
    á: 0xe1,
    é: 0xe9,
    í: 0xed,
    ó: 0xf3,
    ú: 0xfa,
    Á: 0xc1,
    É: 0xc9,
    Í: 0xcd,
    Ó: 0xd3,
    Ú: 0xda,
    ñ: 0xf1,
    Ñ: 0xd1,
    ü: 0xfc,
    '¿': 0xbf,
    '¡': 0xa1,
    º: 0xba,
    ª: 0xaa
  };
  const out: number[] = [];
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) out.push(code);
    else if (map[ch] !== undefined) out.push(map[ch]);
    else throw new Error(`No CP1252 mapping for '${ch}'`);
  }
  return new Uint8Array(out);
}

describe('decodeFileBytes', () => {
  it('decodes plain ASCII as UTF-8', () => {
    const { text, encoding } = decodeFileBytes(utf8('RUC,Razon Social\n123,ACME'));
    expect(text).toBe('RUC,Razon Social\n123,ACME');
    expect(encoding).toBe('utf-8');
  });

  it('decodes UTF-8 with Spanish accents', () => {
    const { text, encoding } = decodeFileBytes(utf8('Razón Social,Año\nMontaña,2024'));
    expect(text).toBe('Razón Social,Año\nMontaña,2024');
    expect(encoding).toBe('utf-8');
  });

  it('decodes UTF-8 with BOM (BOM kept; consumer strips per header)', () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const body = utf8('Razón,123');
    const merged = new Uint8Array(bom.length + body.length);
    merged.set(bom);
    merged.set(body, bom.length);
    const { text, encoding } = decodeFileBytes(merged);
    expect(text.endsWith('Razón,123')).toBe(true);
    expect(encoding).toBe('utf-8');
  });

  it('falls back to Windows-1252 for Spanish accents (Concar/Excel ES exports)', () => {
    const { text, encoding } = decodeFileBytes(cp1252('Razón Social,Año\nMontaña Ñandú,2024'));
    expect(text).toBe('Razón Social,Año\nMontaña Ñandú,2024');
    expect(encoding).toBe('windows-1252');
  });

  it('falls back to Windows-1252 for Latin-1 punctuation (¿, ¡, ª, º)', () => {
    const { text, encoding } = decodeFileBytes(cp1252('¿correcto? ¡sí! 1ª copia, 2º día'));
    expect(text).toBe('¿correcto? ¡sí! 1ª copia, 2º día');
    expect(encoding).toBe('windows-1252');
  });

  it('decodes empty buffer as empty UTF-8', () => {
    const { text, encoding } = decodeFileBytes(new Uint8Array());
    expect(text).toBe('');
    expect(encoding).toBe('utf-8');
  });
});
