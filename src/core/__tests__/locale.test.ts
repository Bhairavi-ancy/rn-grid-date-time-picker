import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  defaultLocale,
  deriveDateFormat,
  deriveTimeFormat,
  normalizeDateFormat,
} from '../locale';

describe('deriveDateFormat', () => {
  it('follows the locale order and separator', () => {
    expect(deriveDateFormat('en-US')).toBe('MM/dd/yyyy');
    expect(deriveDateFormat('en-GB')).toBe('dd/MM/yyyy');
    expect(deriveDateFormat('de-DE')).toBe('dd.MM.yyyy');
  });

  it("uses '/' when the separator isn't a plain '/', '-' or '.'", () => {
    // ko-KR writes '2006. 11. 22.'
    expect(deriveDateFormat('ko-KR')).toBe('yyyy/MM/dd');
  });

  it('falls back to yyyy-MM-dd for an invalid locale', () => {
    expect(deriveDateFormat('not a locale!')).toBe('yyyy-MM-dd');
  });
});

describe('deriveTimeFormat', () => {
  it('follows the locale clock', () => {
    expect(deriveTimeFormat('en-US')).toBe('12h');
    expect(deriveTimeFormat('en-GB')).toBe('24h');
  });

  it('falls back to 12h for an invalid locale', () => {
    expect(deriveTimeFormat('not a locale!')).toBe('12h');
  });
});

describe('defaultLocale', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads the device locale, or falls back to en-US', () => {
    expect(defaultLocale()).toBe(
      Intl.DateTimeFormat().resolvedOptions().locale
    );
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation((() => {
      throw new RangeError('no Intl');
    }) as never);
    expect(defaultLocale()).toBe('en-US');
  });
});

describe('normalizeDateFormat', () => {
  it('accepts any case and keeps the order and separator', () => {
    expect(normalizeDateFormat('dd/mm/yyyy')).toBe('dd/MM/yyyy');
    expect(normalizeDateFormat('DD-MM-YYYY')).toBe('dd-MM-yyyy');
    expect(normalizeDateFormat('MM/dd/yyyy')).toBe('MM/dd/yyyy');
    expect(normalizeDateFormat('yyyy.mm.dd')).toBe('yyyy.MM.dd');
    expect(normalizeDateFormat(' dd mm yyyy ')).toBe('dd MM yyyy');
  });

  it('rejects formats it can not type or show', () => {
    expect(normalizeDateFormat('d/m/yyyy')).toBeNull();
    expect(normalizeDateFormat('dd/MM/yy')).toBeNull();
    expect(normalizeDateFormat('dd/MM-yyyy')).toBeNull();
    expect(normalizeDateFormat('dd/dd/yyyy')).toBeNull();
    expect(normalizeDateFormat('dd MMM yyyy')).toBeNull();
    expect(normalizeDateFormat('')).toBeNull();
  });
});
