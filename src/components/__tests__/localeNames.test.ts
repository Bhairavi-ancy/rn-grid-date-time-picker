import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  fullDateLabel,
  localeNames,
  weekdayName,
} from '../calendar/localeNames';

describe('localeNames', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('names months and weekdays in the locale', () => {
    expect(localeNames('fr-FR').monthsLong[0]).toBe('janvier');
    expect(localeNames('de-DE').monthsLong[2]).toBe('März');
    expect(weekdayName('en-US', 7)).toBe('Su');
  });

  it("names Gregorian months even where the locale's own calendar is another", () => {
    // iOS writes 'ar-SA' in the Hijri calendar unless told otherwise.
    expect(localeNames('ar-SA').monthsLong[9]).toBe('أكتوبر');
    expect(localeNames('ar-SA-u-ca-islamic-umalqura').monthsLong[9]).toBe(
      'أكتوبر'
    );
  });

  it('reads each name on its own, not from formatToParts', () => {
    // iOS labels every part of some locales as plain text.
    jest
      .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
      .mockImplementation(() => [{ type: 'literal', value: '?' }]);
    expect(localeNames('it-IT').monthsLong[0]).toBe('gennaio');
    expect(fullDateLabel('it-IT', { year: 2026, month: 10, day: 21 })).toBe(
      'mercoledì, 21 ottobre 2026'
    );
  });

  it('falls back to en-US when Intl returns empty names for a locale', () => {
    const real = Intl.DateTimeFormat;
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(((
      locale: string,
      options?: Intl.DateTimeFormatOptions
    ) => {
      const f = new real(locale, options);
      return String(locale).startsWith('nl-NL')
        ? Object.assign(Object.create(f), { format: () => '' })
        : f;
    }) as never);
    const names = localeNames('nl-NL');
    expect(names.monthsLong[9]).toBe('October');
    expect(names.monthsShort[0]).toBe('Jan');
    expect(names.weekdays[0]).toBe('Mo');
  });

  it('writes the screen-reader date as before', () => {
    expect(fullDateLabel('en-US', { year: 2026, month: 10, day: 21 })).toBe(
      'Wednesday, 21 October 2026'
    );
  });
});
