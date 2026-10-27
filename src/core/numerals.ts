/** Which digits the picker shows: always 0–9, or the locale's own (١٢٣ for 'ar-SA'). */
export type Numerals = 'latin' | 'locale';

export const latinDigits = (text: string): string => text;

const cache = new Map<string, (text: string) => string>();

/**
 * Swaps 0–9 in a text for the locale's own digits, as `Intl` writes them
 * ('ar-SA' → ٠–٩, 'fa' → ۰–۹). Latin when the locale uses 0–9 or `Intl` can't
 * tell.
 */
export const localeDigits = (locale: string): ((text: string) => string) => {
  const hit = cache.get(locale);
  if (hit) return hit;
  let swap = latinDigits;
  try {
    const f = new Intl.NumberFormat(locale, { useGrouping: false });
    const digits = Array.from({ length: 10 }, (_, i) => f.format(i));
    if (digits[0] !== '0' && digits.every((d) => [...d].length === 1)) {
      swap = (text) => text.replace(/[0-9]/g, (d) => digits[Number(d)]!);
    }
  } catch {
    // An engine without this locale keeps 0–9.
  }
  cache.set(locale, swap);
  return swap;
};
