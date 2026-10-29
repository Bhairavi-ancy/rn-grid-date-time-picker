import { describe, expect, it } from '@jest/globals';
import { utcMidnightAdapter } from '../../adapters';
import { createConstraints } from '../constraints';
import {
  createDraft,
  draftToWire,
  selectDay,
  setRangeEnd,
  setTime,
  validateDraft,
  type DraftOptions,
} from '../draft';
import { isRangeEndAllowed, withSelectionRules } from '../selectionRules';

const day = (d: number, m = 10) => {
  return { year: 2026, month: m, day: d };
};
// The 'utc-midnight' format, so the saved-string fixtures read as before.
const adapter = utcMidnightAdapter;
const opts: DraftOptions = { type: 'date', zone: 'Asia/Kolkata', adapter };
const wire = (d: number) =>
  `2026-10-${String(d).padStart(2, '0')}T00:00:00.000Z`;
const rangeOf = (from: number, to: number, o: DraftOptions = opts) =>
  createDraft('range', { from: wire(from), to: wire(to) }, o);

describe('range length', () => {
  it('validateDraft flags a range shorter or longer than allowed (calendar days, both ends included)', () => {
    const o = { ...opts, range: { minDays: 3, maxDays: 5 } };
    expect(validateDraft(rangeOf(20, 21, o), o)).toBe('RANGE_LENGTH'); // 2 days
    expect(validateDraft(rangeOf(20, 22, o), o)).toBeNull(); // 3 days
    expect(validateDraft(rangeOf(20, 24, o), o)).toBeNull(); // 5 days
    expect(validateDraft(rangeOf(20, 25, o), o)).toBe('RANGE_LENGTH'); // 6 days
    expect(validateDraft(rangeOf(22, 20, o), o)).toBe('RANGE_ORDER');
  });

  it('isRangeEndAllowed: before the start only in the single field', () => {
    expect(isRangeEndAllowed(day(20), day(18), {})).toBe(true);
    expect(
      isRangeEndAllowed(day(20), day(18), { blockBeforeStart: true })
    ).toBe(false);
    // Lengths count calendar days with both ends included.
    expect(isRangeEndAllowed(day(20), day(21), { minDays: 3 })).toBe(false);
    expect(isRangeEndAllowed(day(20), day(24), { maxDays: 4 })).toBe(false);
    expect(
      isRangeEndAllowed(day(20), day(23), { minDays: 3, maxDays: 4 })
    ).toBe(true);
    expect(isRangeEndAllowed(day(20), day(20), { minDays: 1 })).toBe(true);
  });
});

describe('From/To layout: setRangeEnd', () => {
  const empty = createDraft('range', '', opts);

  it('fills the end being edited', () => {
    const a = setRangeEnd(empty, day(20), 'from', opts);
    const b = setRangeEnd(a, day(25), 'to', opts);
    expect(
      b.mode === 'range' && [b.from.value?.date, b.to.value?.date]
    ).toEqual([day(20), day(25)]);
  });

  it('a start after the end (or an end before the start) clears the other end', () => {
    const r = rangeOf(20, 25);
    const later = setRangeEnd(r, day(27), 'from', opts);
    expect(later.mode === 'range' && later.to.value).toBeNull();
    const earlier = setRangeEnd(r, day(18), 'to', opts);
    expect(earlier.mode === 'range' && earlier.from.value).toBeNull();
    const sameDay = setRangeEnd(r, day(20), 'to', opts);
    expect(sameDay.mode === 'range' && sameDay.from.value).toBeNull();
    const allowed = { ...opts, range: { allowSameDay: true } };
    const ok = setRangeEnd(r, day(20), 'to', allowed);
    expect(ok.mode === 'range' && ok.from.value?.date).toEqual(day(20));
  });

  it('keeps the time of the end it moves (date-time)', () => {
    const dt: DraftOptions = {
      type: 'datetime',
      zone: 'Asia/Kolkata',
      adapter,
    };
    const r = createDraft(
      'range',
      { from: '2026-10-20T04:30:00.000Z', to: '2026-10-25T12:30:00.000Z' },
      dt
    );
    const moved = setRangeEnd(r, day(26), 'to', dt);
    expect(moved.mode === 'range' && moved.to.value).toEqual({
      date: day(26),
      time: { hour: 18, minute: 0 },
    });
  });
});

describe('withSelectionRules', () => {
  const base = createConstraints({
    type: 'date',
    timeZone: 'Asia/Kolkata',
    now: new Date(Date.UTC(2026, 9, 21)),
  });

  it('greys ends outside the allowed length while the end is chosen', () => {
    const c = withSelectionRules(base, {
      rangeStart: day(20),
      minDays: 3,
      maxDays: 5,
    });
    expect(c.dayStatus(day(21)).disabled).toBe(true); // 2 days
    expect(c.dayStatus(day(21)).reasons).toContain('RANGE_LENGTH');
    expect(c.dayStatus(day(22)).disabled).toBe(false); // 3 days
    expect(c.dayStatus(day(24)).disabled).toBe(false); // 5 days
    expect(c.dayStatus(day(25)).disabled).toBe(true); // 6 days
    expect(c.dayStatus(day(20)).disabled).toBe(false); // the start itself
    expect(c.dayStatus(day(15)).disabled).toBe(false); // restarts the range
  });

  it('once the cap is reached only picked days can be tapped', () => {
    const picked = [day(20), day(22)];
    const c = withSelectionRules(base, {
      maxReached: true,
      isSelected: (x) =>
        picked.some((p) => p.day === x.day && p.month === x.month),
    });
    expect(c.dayStatus(day(20)).disabled).toBe(false);
    expect(c.dayStatus(day(21)).reasons).toContain('MAX_SELECTIONS');
  });

  it('returns the same rules when nothing applies', () => {
    expect(withSelectionRules(base, {})).toBe(base);
  });
});

describe('multiple: saved times', () => {
  const dt: DraftOptions = {
    type: 'datetime',
    zone: 'UTC',
    adapter: utcMidnightAdapter,
  };
  const saved = ['2026-10-24T09:00:00.000Z', '2026-10-25T15:00:00.000Z'];

  it('dates saved with different times keep them on an unchanged Confirm', () => {
    const draft = createDraft('multiple', saved, dt);
    expect(validateDraft(draft, dt)).toBeNull();
    expect(draftToWire(draft, dt)).toEqual(saved);
  });

  it('adding a day keeps the other dates own times', () => {
    const draft = selectDay(createDraft('multiple', saved, dt), day(26), dt, {
      hour: 10,
      minute: 0,
    });
    expect(draftToWire(draft, dt)).toEqual([
      ...saved,
      '2026-10-26T10:00:00.000Z',
    ]);
  });

  it('a shared time set by the user applies to every date', () => {
    const draft = setTime(
      createDraft('multiple', saved, dt),
      { hour: 12, minute: 30 },
      'shared'
    );
    expect(draftToWire(draft, dt)).toEqual([
      '2026-10-24T12:30:00.000Z',
      '2026-10-25T12:30:00.000Z',
    ]);
  });

  it('a day listed twice is one date', () => {
    const draft = createDraft('multiple', [wire(24), wire(24), wire(26)], {
      ...opts,
      multiple: { maxSelections: 2 },
    });
    expect(
      validateDraft(draft, { ...opts, multiple: { maxSelections: 2 } })
    ).toBeNull();
    const after = selectDay(draft, day(24), opts);
    expect(draftToWire(after, opts)).toEqual([wire(26)]);
  });
});
