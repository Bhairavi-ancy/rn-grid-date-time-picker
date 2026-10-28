import { describe, expect, it } from '@jest/globals';
import { arabicDigits, latinDigits, localeDigits } from '../numerals';

describe('localeDigits', () => {
  it("uses the locale's own digits", () => {
    expect(localeDigits('ar-SA')('2026-10-27')).toBe('٢٠٢٦-١٠-٢٧');
    expect(localeDigits('fa-IR')('1405')).toBe('۱۴۰۵');
  });

  it('keeps 0–9 for a locale that writes them, or asks for them', () => {
    expect(localeDigits('en-US')('2026')).toBe('2026');
    expect(localeDigits('ar-AE')('2026')).toBe('2026');
    expect(localeDigits('ar-SA-u-nu-latn')('2026')).toBe('2026');
  });

  it("keeps 0–9 for a tag Intl can't read", () => {
    expect(localeDigits('not a locale!')('12')).toBe('12');
    expect(latinDigits('12')).toBe('12');
  });
});

describe('arabicDigits', () => {
  it('uses Arabic-Indic digits whatever the text', () => {
    expect(arabicDigits('Jumada I 9, 1448 AH')).toBe('Jumada I ٩, ١٤٤٨ AH');
    expect(arabicDigits('0123456789')).toBe('٠١٢٣٤٥٦٧٨٩');
  });
});
