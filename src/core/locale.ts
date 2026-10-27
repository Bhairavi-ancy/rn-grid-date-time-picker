import type { TimeFormat, Weekday } from './types';

/**
 * Locale defaults, read from the platform's Intl. Each helper falls back to a
 * fixed value when Intl is missing or doesn't know the locale.
 */

const FALLBACK_LOCALE = 'en-US';
const FALLBACK_DATE_FORMAT = 'yyyy-MM-dd';
const SEPARATORS = ['/', '-', '.'];
const DATE_TOKENS: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {
  day: 'dd',
  month: 'MM',
  year: 'yyyy',
};

/** The device locale (a BCP-47 tag), or 'en-US'. */
export const defaultLocale = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || FALLBACK_LOCALE;
  } catch {
    return FALLBACK_LOCALE;
  }
};

/**
 * The locale's numeric date order as a `dateFormat`: 'MM/dd/yyyy' for en-US,
 * 'dd/MM/yyyy' for en-GB, 'dd.MM.yyyy' for de-DE. The first separator is kept
 * when it is exactly '/', '-' or '.'; anything longer (ko-KR's '. ') or
 * different becomes '/'. Trailing text is dropped. Falls back to 'yyyy-MM-dd'.
 */
export const deriveDateFormat = (locale: string): string => {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(Date.UTC(2006, 10, 22)));
    const tokens = parts.flatMap((p) => DATE_TOKENS[p.type] ?? []);
    if (
      tokens.length !== 3 ||
      !['dd', 'MM', 'yyyy'].every((t) => tokens.includes(t))
    )
      return FALLBACK_DATE_FORMAT;
    const first = parts.find((p) => p.type === 'literal')?.value ?? '';
    const separator = SEPARATORS.includes(first) ? first : '/';
    return tokens.join(separator);
  } catch {
    return FALLBACK_DATE_FORMAT;
  }
};

const DATE_FORMAT_PATTERN =
  /^(dd|mm|yyyy)([/\-., ])(dd|mm|yyyy)\2(dd|mm|yyyy)$/i;

/**
 * A `dateFormat` written in any case ('dd/mm/yyyy', 'DD-MM-YYYY') in the form
 * the picker uses ('dd/MM/yyyy'). Null unless it is a two-digit day, a
 * two-digit month and a four-digit year, each once, with the same separator
 * ('/', '-', '.', a space or a comma) between them.
 */
export const normalizeDateFormat = (format: string): string | null => {
  if (typeof format !== 'string') return null;
  const m = DATE_FORMAT_PATTERN.exec(format.trim());
  if (!m) return null;
  const tokens = [m[1], m[3], m[4]].map((t) => (t ?? '').toLowerCase());
  if (new Set(tokens).size !== 3) return null;
  return tokens.map((t) => (t === 'mm' ? 'MM' : t)).join(m[2]);
};

/** Whether the locale writes times on a 12- or 24-hour clock. Falls back to '12h'. */
export const deriveTimeFormat = (locale: string): TimeFormat => {
  try {
    const format = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
    const cycle = format.resolvedOptions().hourCycle;
    if (cycle === 'h23' || cycle === 'h24') return '24h';
    if (cycle === 'h11' || cycle === 'h12') return '12h';
    const parts = format.formatToParts(new Date(Date.UTC(2006, 10, 22, 13)));
    return parts.some((p) => p.type === 'dayPeriod') ? '12h' : '24h';
  } catch {
    return '12h';
  }
};

// Regions whose week doesn't start on Monday, from CLDR 48 week data. Kept as a
// table because Intl's week info isn't available on every engine (Hermes).
const FRIDAY_REGIONS = new Set(['MV']);
const SATURDAY_REGIONS = new Set(
  'AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'.split(' ')
);
const SUNDAY_REGIONS = new Set(
  (
    'AG AS BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN IS JM JP KE ' +
    'KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW ' +
    'UM US VE VI WS YE ZA ZW'
  ).split(' ')
);

/** The region subtag of a BCP-47 tag ('US' in 'en-US', 'TW' in 'zh-Hant-TW'), or null. */
const regionOf = (locale: string): string | null => {
  for (const part of locale.split(/[-_]/).slice(1)) {
    if (part.length === 1) break; // an extension ('-u-…') starts here
    if (/^([A-Za-z]{2}|\d{3})$/.test(part)) return part.toUpperCase();
  }
  return null;
};

/**
 * The first day of the week in the locale's region (1 = Monday … 7 = Sunday):
 * Sunday for en-US, Monday for en-GB and de-DE, Saturday for ar-EG. A tag
 * without a region ('en', 'fr') falls back to Sunday.
 */
export const deriveFirstDayOfWeek = (locale: string): Weekday => {
  const region = typeof locale === 'string' ? regionOf(locale) : null;
  if (!region) return 7;
  if (SUNDAY_REGIONS.has(region)) return 7;
  if (SATURDAY_REGIONS.has(region)) return 6;
  if (FRIDAY_REGIONS.has(region)) return 5;
  return 1;
};
