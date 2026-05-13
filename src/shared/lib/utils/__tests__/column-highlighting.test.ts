import { describe, it, expect } from 'vitest';
import {
  shouldHighlightColumn,
  shouldUseOrangeHighlight,
  getHighlightCellClasses,
  getHighlightContentClasses,
  getHighlightHeaderClasses,
  getHighlightFooterClasses
} from '../column-highlighting';

describe('shouldHighlightColumn', () => {
  it('returns true for sales highlighted fields', () => {
    expect(shouldHighlightColumn('sales', 'taxableBase')).toBe(true);
    expect(shouldHighlightColumn('sales', 'vatAmount')).toBe(true);
    expect(shouldHighlightColumn('sales', 'totalAmount')).toBe(true);
    expect(shouldHighlightColumn('sales', 'vatPercentage')).toBe(true);
  });

  it('returns false for non-highlighted sales fields', () => {
    expect(shouldHighlightColumn('sales', 'ruc')).toBe(false);
    expect(shouldHighlightColumn('sales', 'businessName')).toBe(false);
  });

  it('returns true for purchases highlighted fields', () => {
    expect(shouldHighlightColumn('purchases', 'taxableBaseTaxed')).toBe(true);
    expect(shouldHighlightColumn('purchases', 'vatAmountTaxed')).toBe(true);
    expect(shouldHighlightColumn('purchases', 'nonTaxableValue')).toBe(true);
  });
});

describe('shouldUseOrangeHighlight', () => {
  it('returns true only for vatPercentage', () => {
    expect(shouldUseOrangeHighlight('vatPercentage')).toBe(true);
    expect(shouldUseOrangeHighlight('totalAmount')).toBe(false);
    expect(shouldUseOrangeHighlight('ruc')).toBe(false);
  });
});

describe('getHighlightCellClasses', () => {
  it('returns no style when not highlighted', () => {
    expect(getHighlightCellClasses(false)).toEqual({ className: '' });
  });

  it('returns orange background for vatPercentage', () => {
    const { style } = getHighlightCellClasses(true, 'vatPercentage');
    expect(style?.backgroundColor).toBeDefined();
  });

  it('returns yellow background for other highlighted fields', () => {
    const yellow = getHighlightCellClasses(true, 'taxableBase');
    const orange = getHighlightCellClasses(true, 'vatPercentage');
    expect(yellow.style?.backgroundColor).not.toBe(orange.style?.backgroundColor);
  });
});

describe('getHighlightContentClasses', () => {
  it('returns class string when highlighted', () => {
    expect(getHighlightContentClasses(true)).toContain('font-semibold');
  });

  it('returns empty string when not highlighted', () => {
    expect(getHighlightContentClasses(false)).toBe('');
  });
});

describe('getHighlightHeaderClasses', () => {
  it('returns style when highlighted', () => {
    expect(getHighlightHeaderClasses(true).style).toBeDefined();
  });

  it('returns no style when not highlighted', () => {
    expect(getHighlightHeaderClasses(false).style).toBeUndefined();
  });
});

describe('getHighlightFooterClasses', () => {
  it('returns style when highlighted', () => {
    expect(getHighlightFooterClasses(true).style).toBeDefined();
  });

  it('returns no style when not highlighted', () => {
    expect(getHighlightFooterClasses(false).style).toBeUndefined();
  });
});
