import { describe, expect, it } from '@jest/globals';
import {
  formatValueText,
  placeholderText,
  segmentErrorText,
} from '../field/fieldText';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';

const strings = DEFAULT_STRINGS;
const value = {
  date: { year: 2026, month: 10, day: 21 },
  time: { hour: 15, minute: 5 },
};

describe('fieldText', () => {
  it('formats the date in the locale order and always shows AM/PM in 12-hour time', () => {
    expect(formatValueText(value, 'date', 'dd-MM-yyyy', '12h')).toBe(
      '21-10-2026'
    );
    expect(formatValueText(value, 'date', 'MM-dd-yyyy', '12h')).toBe(
      '10-21-2026'
    );
    expect(formatValueText(value, 'datetime', 'dd-MM-yyyy', '12h')).toBe(
      '21-10-2026 03:05 PM'
    );
    expect(formatValueText(value, 'datetime', 'dd-MM-yyyy', '24h')).toBe(
      '21-10-2026 15:05'
    );
    expect(
      formatValueText(
        { ...value, time: { hour: 0, minute: 0 } },
        'datetime',
        'dd-MM-yyyy',
        '12h'
      )
    ).toBe('21-10-2026 12:00 AM');
    expect(formatValueText(null, 'date', 'dd-MM-yyyy', '12h')).toBe('');
  });

  it('builds a placeholder that matches the format', () => {
    expect(placeholderText('date', 'dd-MM-yyyy', '12h')).toBe('DD-MM-YYYY');
    expect(placeholderText('datetime', 'MM-dd-yyyy', '12h')).toBe(
      'MM-DD-YYYY hh:mm AM'
    );
    expect(placeholderText('datetime', 'dd-MM-yyyy', '24h')).toBe(
      'DD-MM-YYYY HH:mm'
    );
  });

  it('picks the message for the first typing problem', () => {
    expect(segmentErrorText([{ key: 'year', code: 'REQUIRED' }], strings)).toBe(
      strings.errorIncomplete
    );
    expect(
      segmentErrorText([{ key: 'minute', code: 'REQUIRED' }], strings)
    ).toBe(strings.errorIncompleteTime);
    expect(
      segmentErrorText([{ key: 'hour', code: 'OUT_OF_RANGE' }], strings)
    ).toBe(strings.errorInvalidTime);
    expect(
      segmentErrorText([{ key: 'date', code: 'INVALID_DATE' }], strings)
    ).toBe(strings.errorInvalidDate);
    expect(segmentErrorText([], strings)).toBe('');
  });
});
