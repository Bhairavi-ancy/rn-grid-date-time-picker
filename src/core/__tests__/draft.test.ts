import { describe, expect, it } from '@jest/globals';
import {
  clearDraft,
  createDraft,
  DEFAULT_TIME,
  draftToWire,
  selectDay,
  setSlotValue,
  setTime,
  validateDraft,
  type DraftOptions,
} from '../draft';
import { utcMidnightAdapter } from '../../adapters';

const IST = 'Asia/Kolkata';
// The 'utc-midnight' format, so the saved-string fixtures read as before.
const adapter = utcMidnightAdapter;
const dateOpts: DraftOptions = { type: 'date', zone: IST, adapter };
const dtOpts: DraftOptions = { type: 'datetime', zone: IST, adapter };
const oct = (day: number) => {
  return { year: 2026, month: 10, day };
};

describe('draft: single', () => {
  it('opens on the stored value and saves it back unchanged', () => {
    const draft = createDraft('single', '2026-10-21T05:00:12.345Z', dtOpts);
    expect(draft).toMatchObject({
      slot: { value: { date: oct(21), time: { hour: 10, minute: 30 } } },
    });
    expect(draftToWire(draft, dtOpts)).toBe('2026-10-21T05:00:12.345Z'); // seconds kept: unchanged Confirm
  });

  it('defaults the time to 12:00 AM when only a day is picked', () => {
    const draft = selectDay(createDraft('single', '', dtOpts), oct(21), dtOpts);
    expect(DEFAULT_TIME).toEqual({ hour: 0, minute: 0 });
    expect(draftToWire(draft, dtOpts)).toBe('2026-10-20T18:30:00.000Z');
  });

  it('gives a newly picked day the time passed in', () => {
    const draft = selectDay(createDraft('single', '', dtOpts), oct(5), dtOpts, {
      hour: 10,
      minute: 30,
    });
    expect(draftToWire(draft, dtOpts)).toBe('2026-10-05T05:00:00.000Z');
  });

  it('keeps the existing time when another day is picked', () => {
    const draft = selectDay(
      createDraft('single', '2026-10-21T05:00:00.000Z', dtOpts),
      oct(22),
      dtOpts
    );
    expect(draftToWire(draft, dtOpts)).toBe('2026-10-22T05:00:00.000Z');
  });

  it('saves a changed time with seconds zeroed', () => {
    const draft = setTime(
      createDraft('single', '2026-10-21T05:00:12.345Z', dtOpts),
      { hour: 11, minute: 0 },
      'single'
    );
    expect(draftToWire(draft, dtOpts)).toBe('2026-10-21T05:30:00.000Z');
  });

  it('is incomplete without a day, and saves "" when cleared', () => {
    const draft = createDraft('single', '', dateOpts);
    expect(validateDraft(draft, dateOpts)).toBe('INCOMPLETE');
    const cleared = clearDraft(
      createDraft('single', '2026-10-21T00:00:00.000Z', dateOpts)
    );
    expect(draftToWire(cleared, dateOpts)).toBe('');
  });

  it('saves a date field as UTC midnight of the picked day', () => {
    const draft = selectDay(
      createDraft('single', '', dateOpts),
      oct(21),
      dateOpts
    );
    expect(validateDraft(draft, dateOpts)).toBeNull();
    expect(draftToWire(draft, dateOpts)).toBe('2026-10-21T00:00:00.000Z');
  });
});

describe('draft: range', () => {
  it('first tap = start, second tap = end', () => {
    let draft = createDraft('range', { from: '', to: '' }, dateOpts);
    draft = selectDay(draft, oct(10), dateOpts);
    expect(validateDraft(draft, dateOpts)).toBe('INCOMPLETE');
    draft = selectDay(draft, oct(14), dateOpts);
    expect(validateDraft(draft, dateOpts)).toBeNull();
    expect(draftToWire(draft, dateOpts)).toEqual({
      from: '2026-10-10T00:00:00.000Z',
      to: '2026-10-14T00:00:00.000Z',
    });
  });

  it('a tap before the start moves the start', () => {
    let draft = selectDay(
      createDraft('range', '', dateOpts),
      oct(10),
      dateOpts
    );
    draft = selectDay(draft, oct(5), dateOpts);
    expect(draftToWire(draft, dateOpts)).toEqual({
      from: '2026-10-05T00:00:00.000Z',
      to: '',
    });
  });

  it('rejects a same-day date range unless allowed (filters reject it today)', () => {
    let draft = selectDay(
      createDraft('range', '', dateOpts),
      oct(10),
      dateOpts
    );
    draft = selectDay(draft, oct(10), dateOpts);
    expect(draftToWire(draft, dateOpts)).toEqual({ from: '', to: '' });

    const allow: DraftOptions = { ...dateOpts, range: { allowSameDay: true } };
    let ok = selectDay(createDraft('range', '', allow), oct(10), allow);
    ok = selectDay(ok, oct(10), allow);
    expect(validateDraft(ok, allow)).toBeNull();
  });

  it('starts a new range after a complete one, or moves the nearest end', () => {
    const full = createDraft(
      'range',
      ['2026-10-10T00:00:00.000Z', '2026-10-20T00:00:00.000Z'],
      dateOpts
    );
    expect(draftToWire(selectDay(full, oct(25), dateOpts), dateOpts)).toEqual({
      from: '2026-10-25T00:00:00.000Z',
      to: '',
    });

    const move: DraftOptions = {
      ...dateOpts,
      range: { reselect: 'moveNearestEnd' },
    };
    expect(draftToWire(selectDay(full, oct(12), move), move)).toEqual({
      from: '2026-10-12T00:00:00.000Z',
      to: '2026-10-20T00:00:00.000Z',
    });
  });

  it('date-time range: same day allowed, but the end must be after the start', () => {
    let draft = selectDay(createDraft('range', '', dtOpts), oct(10), dtOpts);
    draft = selectDay(draft, oct(10), dtOpts);
    draft = setTime(draft, { hour: 9, minute: 0 }, 'from');
    draft = setTime(draft, { hour: 9, minute: 0 }, 'to');
    expect(validateDraft(draft, dtOpts)).toBe('RANGE_ORDER');
    draft = setTime(draft, { hour: 17, minute: 0 }, 'to');
    expect(validateDraft(draft, dtOpts)).toBeNull();
  });
});

describe('draft: multiple', () => {
  it('toggles days, keeps them sorted, and caps the count', () => {
    const opts: DraftOptions = { ...dateOpts, multiple: { maxSelections: 2 } };
    let draft = createDraft('multiple', [], opts);
    draft = selectDay(draft, oct(14), opts);
    draft = selectDay(draft, oct(10), opts);
    draft = selectDay(draft, oct(20), opts); // ignored: max 2
    expect(draftToWire(draft, opts)).toEqual([
      '2026-10-10T00:00:00.000Z',
      '2026-10-14T00:00:00.000Z',
    ]);
    draft = selectDay(draft, oct(10), opts); // toggled off
    expect(draftToWire(draft, opts)).toEqual(['2026-10-14T00:00:00.000Z']);
  });

  it('reads a non-empty string as a one-item list (no comma splitting)', () => {
    const one = createDraft('multiple', '2026-10-10T00:00:00.000Z', dateOpts);
    expect(draftToWire(one, dateOpts)).toEqual(['2026-10-10T00:00:00.000Z']);
    const joined = createDraft(
      'multiple',
      '2026-10-10T00:00:00.000Z,2026-10-11T00:00:00.000Z',
      dateOpts
    );
    expect(draftToWire(joined, dateOpts)).toEqual([]);
    expect(
      draftToWire(createDraft('multiple', '', dateOpts), dateOpts)
    ).toEqual([]);
  });

  it('shared time applies to every date; per-date time does not', () => {
    const shared: DraftOptions = {
      ...dtOpts,
      multiple: { timeMode: 'shared' },
    };
    let draft = selectDay(
      selectDay(createDraft('multiple', [], shared), oct(10), shared),
      oct(11),
      shared
    );
    draft = setTime(draft, { hour: 9, minute: 0 }, 'shared');
    expect(draftToWire(draft, shared)).toEqual([
      '2026-10-10T03:30:00.000Z',
      '2026-10-11T03:30:00.000Z',
    ]);

    const perDate: DraftOptions = {
      ...dtOpts,
      multiple: { timeMode: 'perDate' },
    };
    let per = selectDay(
      selectDay(createDraft('multiple', [], perDate), oct(10), perDate),
      oct(11),
      perDate
    );
    per = setTime(per, { hour: 9, minute: 0 }, { index: 1 });
    expect(draftToWire(per, perDate)).toEqual([
      '2026-10-09T18:30:00.000Z',
      '2026-10-11T03:30:00.000Z',
    ]);
  });
});

describe('draft: typed value replaces a slot', () => {
  it('sets the whole value from the parsed field', () => {
    const draft = setSlotValue(
      createDraft('single', '', dtOpts),
      { date: oct(21), time: { hour: 15, minute: 45 } },
      'single'
    );
    expect(draftToWire(draft, dtOpts)).toBe('2026-10-21T10:15:00.000Z');
  });
});
