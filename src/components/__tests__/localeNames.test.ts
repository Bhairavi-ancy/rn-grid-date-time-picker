import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Info } from 'luxon';
import { localeNames, weekdayName } from '../calendar/localeNames';

describe('localeNames', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('names months and weekdays in the locale', () => {
    expect(localeNames('fr-FR').monthsLong[0]).toBe('janvier');
    expect(weekdayName('en-US', 7)).toBe('Su');
  });

  it('falls back to en-US when Intl returns empty names for a locale', () => {
    const months = Info.months;
    jest
      .spyOn(Info, 'months')
      .mockImplementation((length, opts) =>
        opts?.locale === 'xx-empty' ? [] : months(length, opts)
      );
    const weekdays = Info.weekdays;
    jest
      .spyOn(Info, 'weekdays')
      .mockImplementation((length, opts) =>
        opts?.locale === 'xx-empty'
          ? (Array(7).fill(undefined) as string[])
          : weekdays(length, opts)
      );
    const names = localeNames('xx-empty');
    expect(names.monthsLong[9]).toBe('October');
    expect(names.monthsShort[0]).toBe('Jan');
    expect(names.weekdays[0]).toBe('Mo');
  });
});
