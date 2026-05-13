import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (tailwind merge)', () => {
  it('combina clases y elimina duplicados', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('acepta condicionales', () => {
    const flag = false as boolean;
    expect(cn('a', flag && 'b', 'c')).toBe('a c');
  });

  it('acepta objetos clsx', () => {
    expect(cn({ a: true, b: false })).toBe('a');
  });
});
