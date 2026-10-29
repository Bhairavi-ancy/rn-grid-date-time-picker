import { describe, expect, it } from '@jest/globals';
import {
  formatSegments,
  from12Hour,
  inputDigit,
  padSegment,
  parseSegments,
  segmentLayout,
  to12Hour,
} from '../segments';

describe('segments: layout by locale', () => {
  it('follows dd-MM-yyyy (en-IN / en-GB) and MM-dd-yyyy (en-US)', () => {
    expect(
      segmentLayout('dd-MM-yyyy', 'date', '12h').segments.map((s) => s.key)
    ).toEqual(['day', 'month', 'year']);
    expect(
      segmentLayout('MM-dd-yyyy', 'date', '12h').segments.map((s) => s.key)
    ).toEqual(['month', 'day', 'year']);
    expect(segmentLayout('MM-dd-yyyy', 'date', '12h').dateSeparator).toBe('-');
  });

  it('adds hour, minute and AM/PM for date-time (no AM/PM in 24-hour)', () => {
    expect(
      segmentLayout('dd-MM-yyyy', 'datetime', '12h').segments.map((s) => s.key)
    ).toEqual(['day', 'month', 'year', 'hour', 'minute', 'period']);
    expect(
      segmentLayout('dd-MM-yyyy', 'datetime', '24h').segments.map((s) => s.key)
    ).toEqual(['day', 'month', 'year', 'hour', 'minute']);
  });
});

describe('segments: typing', () => {
  const [day, month, year, hour] = segmentLayout(
    'dd-MM-yyyy',
    'datetime',
    '12h'
  ).segments;

  it('moves on when a segment is full', () => {
    expect(inputDigit('1', '2', month)).toEqual({ next: '12', advance: true });
    expect(inputDigit('202', '6', year)).toEqual({
      next: '2026',
      advance: true,
    });
  });

  it('moves on early when no two-digit value can start with the digit', () => {
    expect(inputDigit('', '4', month)).toEqual({ next: '4', advance: true }); // 40+ isn't a month
    expect(inputDigit('', '1', month)).toEqual({ next: '1', advance: false }); // could be 10–12
    expect(inputDigit('', '3', day)).toEqual({ next: '3', advance: false }); // could be 30–31
    expect(inputDigit('', '4', day)).toEqual({ next: '4', advance: true });
    expect(inputDigit('', '2', hour)).toEqual({ next: '2', advance: true }); // 12-hour: 20+ isn't valid
  });

  it('starts over when typing into a full segment, and ignores non-digits', () => {
    expect(inputDigit('12', '0', month)).toEqual({ next: '0', advance: false });
    expect(inputDigit('1', 'x', month)).toEqual({ next: '1', advance: false });
  });

  it('pads on leave, but never the year', () => {
    expect(padSegment('7', day)).toBe('07');
    expect(padSegment('', day)).toBe('');
    expect(padSegment('26', year)).toBe('26');
  });
});

describe('segments: 12-hour conversion', () => {
  it('maps midnight and noon correctly', () => {
    expect(to12Hour(0)).toEqual({ hour12: 12, period: 'AM' });
    expect(to12Hour(12)).toEqual({ hour12: 12, period: 'PM' });
    expect(to12Hour(15)).toEqual({ hour12: 3, period: 'PM' });
    expect(from12Hour(12, 'AM')).toBe(0);
    expect(from12Hour(12, 'PM')).toBe(12);
    expect(from12Hour(3, 'PM')).toBe(15);
  });
});

describe('segments: parse and format', () => {
  const opts = {
    type: 'datetime' as const,
    timeFormat: '12h' as const,
    yearRange: { first: 1900, last: 2200 },
  };

  it('parses a complete, valid entry', () => {
    const parsed = parseSegments(
      {
        day: '21',
        month: '10',
        year: '2026',
        hour: '03',
        minute: '45',
        period: 'PM',
      },
      opts
    );
    expect(parsed).toEqual({
      value: {
        date: { year: 2026, month: 10, day: 21 },
        time: { hour: 15, minute: 45 },
      },
      errors: [],
      isEmpty: false,
    });
  });

  it('reports missing parts, impossible dates and years out of range', () => {
    expect(parseSegments({ day: '21', month: '10' }, opts).errors).toEqual(
      expect.arrayContaining([
        { key: 'year', code: 'REQUIRED' },
        { key: 'hour', code: 'REQUIRED' },
      ])
    );
    expect(
      parseSegments(
        {
          day: '31',
          month: '02',
          year: '2026',
          hour: '01',
          minute: '00',
          period: 'AM',
        },
        opts
      ).errors
    ).toEqual([{ key: 'date', code: 'INVALID_DATE' }]);
    expect(
      parseSegments(
        {
          day: '01',
          month: '01',
          year: '1800',
          hour: '01',
          minute: '00',
          period: 'AM',
        },
        opts
      ).errors
    ).toEqual([{ key: 'year', code: 'YEAR_RANGE' }]);
    expect(
      parseSegments(
        {
          day: '01',
          month: '13',
          year: '2026',
          hour: '01',
          minute: '60',
          period: 'AM',
        },
        opts
      ).errors
    ).toEqual(
      expect.arrayContaining([
        { key: 'month', code: 'OUT_OF_RANGE' },
        { key: 'minute', code: 'OUT_OF_RANGE' },
      ])
    );
  });

  it('treats an all-empty field as cleared', () => {
    expect(parseSegments({}, opts)).toEqual({
      value: null,
      errors: [],
      isEmpty: true,
    });
  });

  it('formats a value back into segments', () => {
    const value = {
      date: { year: 2026, month: 3, day: 5 },
      time: { hour: 0, minute: 7 },
    };
    expect(formatSegments(value, 'datetime', '12h')).toEqual({
      day: '05',
      month: '03',
      year: '2026',
      hour: '12',
      minute: '07',
      period: 'AM',
    });
    expect(formatSegments(value, 'datetime', '24h')).toMatchObject({
      hour: '00',
      minute: '07',
    });
    expect(formatSegments(null, 'date', '12h')).toEqual({});
  });
});

describe('parseSegments: an empty 12-hour field', () => {
  it('is empty once every digit is gone, even with AM/PM still set', () => {
    const parsed = parseSegments(
      { day: '', month: '', year: '', hour: '', minute: '', period: 'PM' },
      { type: 'datetime', timeFormat: '12h' }
    );
    expect(parsed.isEmpty).toBe(true);
    expect(parsed.errors).toEqual([]);
  });
});
