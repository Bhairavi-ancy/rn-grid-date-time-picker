import { describe, expect, it } from '@jest/globals';
import { firstSelectedDay, selectionOf } from '../calendar/selection';

const d = (day: number, month = 10) => {
  return { year: 2026, month, day };
};

describe('calendar selection', () => {
  it('single: only the picked day is selected', () => {
    const sel = { kind: 'single' as const, day: d(21) };
    expect(selectionOf(sel, d(21))).toEqual({ selected: true, role: null });
    expect(selectionOf(sel, d(22))).toEqual({ selected: false, role: null });
    expect(firstSelectedDay({ kind: 'single', day: null })).toBeNull();
  });

  it('range: start, middle band and end; one day alone is "single"', () => {
    const sel = { kind: 'range' as const, from: d(20), to: d(23) };
    expect(selectionOf(sel, d(20)).role).toBe('start');
    expect(selectionOf(sel, d(21))).toEqual({
      selected: false,
      role: 'middle',
    });
    expect(selectionOf(sel, d(23)).role).toBe('end');
    expect(selectionOf(sel, d(24)).role).toBeNull();
    expect(
      selectionOf({ kind: 'range', from: d(20), to: null }, d(20)).role
    ).toBe('single');
    expect(
      selectionOf({ kind: 'range', from: d(20), to: d(20) }, d(20)).role
    ).toBe('single');
    expect(firstSelectedDay({ kind: 'range', from: null, to: d(5) })).toEqual(
      d(5)
    );
  });

  it('multiple: neighbouring days join into a band only when asked', () => {
    const days = [d(30, 9), d(1), d(2), d(5)];
    expect(selectionOf({ kind: 'multiple', days }, d(1))).toEqual({
      selected: true,
      role: null,
    });
    const joined = { kind: 'multiple' as const, days, joinConsecutive: true };
    expect(selectionOf(joined, d(30, 9)).role).toBe('start'); // across the month end
    expect(selectionOf(joined, d(1)).role).toBe('middle');
    expect(selectionOf(joined, d(2)).role).toBe('end');
    expect(selectionOf(joined, d(5)).role).toBeNull();
    expect(selectionOf(joined, d(3)).selected).toBe(false);
  });
});
