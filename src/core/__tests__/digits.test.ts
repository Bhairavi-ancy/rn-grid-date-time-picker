import { describe, expect, it } from '@jest/globals';
import { toLatinDigits } from '../digits';

describe('toLatinDigits', () => {
  it('reads Arabic-Indic, Persian, Devanagari and full-width digits as 0–9', () => {
    expect(toLatinDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(toLatinDigits('۱۴۴۸')).toBe('1448');
    expect(toLatinDigits('०९')).toBe('09');
    expect(toLatinDigits('１２')).toBe('12');
  });

  it('keeps Latin digits and every other character', () => {
    expect(toLatinDigits('2026-10-27')).toBe('2026-10-27');
    expect(toLatinDigits('a٣b:')).toBe('a3b:');
    expect(toLatinDigits('')).toBe('');
  });
});
