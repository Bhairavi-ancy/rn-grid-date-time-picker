import { describe, expect, it } from '@jest/globals';
import {
  acceptBoxText,
  checkTime,
  cleanBoxText,
  completeTimeEntry,
  formatTimeEntry,
  isPeriodAllowed,
  parseTimeEntry,
} from '../timeEntry';

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

describe('timeEntry: what a box accepts', () => {
  it('12h hour: 01–12; a first digit 2–9 becomes 02–09', () => {
    expect(acceptBoxText('1', 'hour', '12h')).toBe('1');
    expect(acceptBoxText('0', 'hour', '12h')).toBe('0');
    expect(acceptBoxText('7', 'hour', '12h')).toBe('07');
    expect(acceptBoxText('12', 'hour', '12h')).toBe('12');
    expect(acceptBoxText('09', 'hour', '12h')).toBe('09');
    expect(acceptBoxText('13', 'hour', '12h')).toBeNull();
    expect(acceptBoxText('00', 'hour', '12h')).toBeNull();
  });

  it('24h hour: 00–23; a first digit 3–9 becomes 03–09', () => {
    expect(acceptBoxText('2', 'hour', '24h')).toBe('2');
    expect(acceptBoxText('3', 'hour', '24h')).toBe('03');
    expect(acceptBoxText('00', 'hour', '24h')).toBe('00');
    expect(acceptBoxText('23', 'hour', '24h')).toBe('23');
    expect(acceptBoxText('24', 'hour', '24h')).toBeNull();
  });

  it('minutes: 00–59 in both formats; a first digit 6–9 becomes 06–09', () => {
    for (const format of ['12h', '24h'] as const) {
      expect(acceptBoxText('5', 'minute', format)).toBe('5');
      expect(acceptBoxText('7', 'minute', format)).toBe('07');
      expect(acceptBoxText('59', 'minute', format)).toBe('59');
      expect(acceptBoxText('60', 'minute', format)).toBeNull();
    }
  });

  it('an emptied box stays empty; other scripts count', () => {
    expect(acceptBoxText('', 'hour', '12h')).toBe('');
    expect(acceptBoxText('۷', 'hour', '12h')).toBe('07');
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

  it('drops a lone 0 in a 12-hour hour instead of padding it to 00', () => {
    expect(
      completeTimeEntry({ hour: '0', minute: '', period: 'AM' }, '12h')
    ).toEqual({
      values: { hour: '', minute: '', period: 'AM' },
      parsed: { time: null, isEmpty: true, issue: null },
    });
    const withMinutes = completeTimeEntry(
      { hour: '0', minute: '10', period: 'AM' },
      '12h'
    );
    expect(withMinutes.values).toEqual({
      hour: '',
      minute: '10',
      period: 'AM',
    });
    expect(withMinutes.parsed.issue).toBe('INCOMPLETE');
  });

  it('keeps a lone 0 in a 24-hour hour as 00', () => {
    expect(completeTimeEntry({ hour: '0', minute: '' }, '24h').values).toEqual({
      hour: '00',
      minute: '00',
    });
  });

  it('fillMinutes: false keeps cleared minutes empty, so the time stays incomplete', () => {
    expect(
      completeTimeEntry({ hour: '9', minute: '' }, '24h', {
        fillMinutes: false,
      })
    ).toEqual({
      values: { hour: '09', minute: '' },
      parsed: { time: null, isEmpty: false, issue: 'INCOMPLETE' },
    });
    // Typed minutes are still padded.
    expect(
      completeTimeEntry({ hour: '9', minute: '5' }, '24h', {
        fillMinutes: false,
      }).values
    ).toEqual({ hour: '09', minute: '05' });
  });
});
