import { describe, expect, it } from '@jest/globals';
import {
  checkTime,
  cleanBoxText,
  completeTimeEntry,
  createTimeEntry,
  formatTimeEntry,
  isPeriodAllowed,
  parseTimeEntry,
  timeEntryReducer,
  type TimeEntryAction,
  type TimeEntryState,
} from '../timeEntry';
import type { TimeFormat } from '../types';

const run = (
  actions: TimeEntryAction[],
  timeFormat: TimeFormat = '12h',
  start: TimeEntryState = createTimeEntry(null, timeFormat)
) => actions.reduce((s, a) => timeEntryReducer(s, a, timeFormat), start);
const digits = (text: string): TimeEntryAction[] =>
  text.split('').map((digit) => {
    return { type: 'digit', digit };
  });

describe('timeEntry: typing', () => {
  it('shows a saved time in 12h and 24h; an empty 12h row starts on AM', () => {
    expect(formatTimeEntry({ hour: 0, minute: 5 }, '12h')).toEqual({
      hour: '12',
      minute: '05',
      period: 'AM',
    });
    expect(formatTimeEntry({ hour: 13, minute: 30 }, '12h')).toEqual({
      hour: '01',
      minute: '30',
      period: 'PM',
    });
    expect(formatTimeEntry({ hour: 13, minute: 30 }, '24h')).toEqual({
      hour: '13',
      minute: '30',
    });
    expect(formatTimeEntry(null, '12h')).toEqual({ period: 'AM' });
    expect(formatTimeEntry(null, '24h')).toEqual({});
  });

  it('two hour digits jump to the minutes; a digit that cannot grow jumps too', () => {
    const s = run([{ type: 'focus', key: 'hour' }, ...digits('10')]);
    expect(s).toEqual({
      values: { period: 'AM', hour: '10' },
      focused: 'minute',
    });
    const padded = run([{ type: 'focus', key: 'hour' }, ...digits('4')]);
    expect(padded.values.hour).toBe('04');
    expect(padded.focused).toBe('minute');
    // 24h: "2" can still become 20–23, "3" cannot.
    expect(
      run([{ type: 'focus', key: 'hour' }, ...digits('2')], '24h').focused
    ).toBe('hour');
    expect(
      run([{ type: 'focus', key: 'hour' }, ...digits('3')], '24h').values.hour
    ).toBe('03');
  });

  it('pads on leaving a box, and Backspace on an empty minute goes back to the hour', () => {
    const s = run([
      { type: 'focus', key: 'minute' },
      ...digits('5'),
      { type: 'blur' },
    ]);
    expect(s.values.minute).toBe('05');
    const back = run([
      { type: 'focus', key: 'hour' },
      ...digits('11'),
      { type: 'backspace' },
    ]);
    expect(back).toEqual({
      values: { period: 'AM', hour: '1' },
      focused: 'hour',
    });
  });

  it('a full box is replaced by the next digit', () => {
    const start = createTimeEntry({ hour: 9, minute: 15 }, '12h');
    const s = run(
      [{ type: 'focus', key: 'minute' }, ...digits('4')],
      '12h',
      start
    );
    expect(s.values.minute).toBe('4');
  });
});

describe('timeEntry: parsing and limits', () => {
  it('parses complete entries; flags unfinished and impossible ones', () => {
    expect(
      parseTimeEntry({ hour: '12', minute: '00', period: 'AM' }, '12h').time
    ).toEqual({ hour: 0, minute: 0 });
    expect(
      parseTimeEntry({ hour: '12', minute: '30', period: 'PM' }, '12h').time
    ).toEqual({ hour: 12, minute: 30 });
    expect(parseTimeEntry({ hour: '23', minute: '59' }, '24h').time).toEqual({
      hour: 23,
      minute: 59,
    });
    expect(parseTimeEntry({ period: 'AM' }, '12h')).toEqual({
      time: null,
      isEmpty: true,
      issue: null,
    });
    expect(parseTimeEntry({ hour: '9', period: 'AM' }, '12h').issue).toBe(
      'INCOMPLETE'
    );
    expect(
      parseTimeEntry({ hour: '00', minute: '10', period: 'AM' }, '12h').issue
    ).toBe('INVALID');
    expect(parseTimeEntry({ hour: '24', minute: '00' }, '24h').issue).toBe(
      'INVALID'
    );
  });

  it('an off-step minute is an error, never rounded', () => {
    expect(checkTime({ hour: 9, minute: 7 }, { minuteStep: 15 })).toBe(
      'OFF_STEP'
    );
    expect(checkTime({ hour: 9, minute: 45 }, { minuteStep: 15 })).toBeNull();
  });

  it('checks the day limits', () => {
    const bounds = {
      min: { hour: 9, minute: 0 },
      max: { hour: 17, minute: 30 },
    };
    expect(checkTime({ hour: 8, minute: 59 }, { bounds })).toBe('BEFORE_MIN');
    expect(checkTime({ hour: 17, minute: 31 }, { bounds })).toBe('AFTER_MAX');
    expect(checkTime({ hour: 17, minute: 30 }, { bounds })).toBeNull();
  });

  it('disables the AM/PM side that cannot hold an allowed time', () => {
    expect(isPeriodAllowed('AM', { min: { hour: 13, minute: 0 } })).toBe(false);
    expect(isPeriodAllowed('PM', { min: { hour: 13, minute: 0 } })).toBe(true);
    expect(isPeriodAllowed('PM', { max: { hour: 11, minute: 59 } })).toBe(
      false
    );
    expect(isPeriodAllowed('PM', { max: { hour: 12, minute: 0 } })).toBe(true);
    expect(isPeriodAllowed('AM', null)).toBe(true);
  });
});

describe('timeEntry: leaving a box', () => {
  it('keeps digits only, at most two', () => {
    expect(cleanBoxText('1a2:3')).toBe('12');
    expect(cleanBoxText('')).toBe('');
  });

  it('reads digits typed in another script', () => {
    expect(cleanBoxText('٠٩')).toBe('09');
    expect(cleanBoxText('۱۲')).toBe('12');
  });

  it('pads a single digit and counts empty minutes as 00', () => {
    expect(
      completeTimeEntry({ hour: '9', minute: '', period: 'PM' }, '12h')
    ).toEqual({
      values: { hour: '09', minute: '00', period: 'PM' },
      parsed: { time: { hour: 21, minute: 0 }, isEmpty: false, issue: null },
    });
    expect(
      completeTimeEntry({ hour: '14', minute: '5' }, '24h').parsed.time
    ).toEqual({ hour: 14, minute: 5 });
  });

  it('fills nothing without an hour', () => {
    const done = completeTimeEntry(
      { hour: '', minute: '30', period: 'AM' },
      '12h'
    );
    expect(done.values.minute).toBe('30');
    expect(done.parsed.issue).toBe('INCOMPLETE');
    expect(completeTimeEntry({ period: 'AM' }, '12h').parsed.isEmpty).toBe(
      true
    );
  });

  it('a padded hour out of range is invalid', () => {
    expect(
      completeTimeEntry({ hour: '0', minute: '10', period: 'AM' }, '12h').parsed
        .issue
    ).toBe('INVALID');
  });
});
