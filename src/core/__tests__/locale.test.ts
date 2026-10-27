import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  defaultLocale,
  deriveDateFormat,
  deriveFirstDayOfWeek,
  deriveTimeFormat,
  normalizeDateFormat,
} from '../locale';

describe('deriveDateFormat', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it("reads the order when the year comes as 'yearName' and the separator has a direction mark", () => {
    // What Hermes on Android returns for 'ar-SA'.
    const parts = [
      { type: 'day', value: '٢٢' },
      { type: 'literal', value: '\u200F-' },
      { type: 'month', value: '١١' },
      { type: 'literal', value: '\u200F-' },
      { type: 'yearName', value: '٢٠٠٦' },
    ];
    jest
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation((() => ({ formatToParts: () => parts })) as never);
    expect(deriveDateFormat('ar-SA')).toBe('dd-MM-yyyy');
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

describe('deriveFirstDayOfWeek', () => {
  it("follows the locale's region", () => {
    expect(deriveFirstDayOfWeek('en-US')).toBe(7);
    expect(deriveFirstDayOfWeek('en-GB')).toBe(1);
    expect(deriveFirstDayOfWeek('de-DE')).toBe(1);
    expect(deriveFirstDayOfWeek('ar-SA')).toBe(7);
    expect(deriveFirstDayOfWeek('ar-EG')).toBe(6);
    expect(deriveFirstDayOfWeek('dv-MV')).toBe(5);
  });

  it('finds the region after a script and before an extension', () => {
    expect(deriveFirstDayOfWeek('zh-Hant-TW')).toBe(7);
    expect(deriveFirstDayOfWeek('en_GB')).toBe(1);
    expect(deriveFirstDayOfWeek('ar-EG-u-ca-islamic')).toBe(6);
    expect(deriveFirstDayOfWeek('es-419')).toBe(1);
  });

  it('falls back to Sunday without a region', () => {
    expect(deriveFirstDayOfWeek('en')).toBe(7);
    expect(deriveFirstDayOfWeek('fr')).toBe(7);
    expect(deriveFirstDayOfWeek('not a locale!')).toBe(7);
  });

  it('agrees with Intl week data where the engine has it', () => {
    for (const tag of ['en-US', 'en-GB', 'ar-EG', 'ja-JP', 'zh-CN', 'pt-BR']) {
      const loc = new Intl.Locale(tag) as Intl.Locale & {
        getWeekInfo?: () => { firstDay: number };
        weekInfo?: { firstDay: number };
      };
      const info = loc.getWeekInfo?.() ?? loc.weekInfo;
      if (info) expect(deriveFirstDayOfWeek(tag)).toBe(info.firstDay);
    }
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

describe('normalizeDateFormat: separators', () => {
  it("allows '/', '-', '.', a space or a comma, and nothing else", () => {
    expect(normalizeDateFormat('dd,mm,yyyy')).toBe('dd,MM,yyyy');
    expect(normalizeDateFormat('dd\nmm\nyyyy')).toBeNull();
    expect(normalizeDateFormat('dd\tmm\tyyyy')).toBeNull();
    expect(normalizeDateFormat('ddxmmxyyyy')).toBeNull();
  });

  it('treats a format that is not a string as missing', () => {
    expect(normalizeDateFormat(42 as unknown as string)).toBeNull();
  });
});
