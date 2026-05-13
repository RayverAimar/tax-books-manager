/**
 * Decode file bytes auto-detecting between UTF-8 (with/without BOM) and Windows-1252.
 *
 * Sistemas contables peruanos comunes (Concar, ContaSIS, Excel ES en Windows) exportan
 * en Windows-1252/Latin-1. Si forzamos UTF-8 los acentos quedan como caracteres de
 * reemplazo silenciosos. Esta función prueba UTF-8 estricto primero y cae a Windows-1252
 * si encuentra bytes inválidos.
 */
export function decodeFileBytes(bytes: Uint8Array): { text: string; encoding: 'utf-8' | 'windows-1252' } {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text, encoding: 'utf-8' };
  } catch {
    const text = new TextDecoder('windows-1252').decode(bytes);
    return { text, encoding: 'windows-1252' };
  }
}
