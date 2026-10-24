import { describe, expect, it } from '@jest/globals';
import { buildMonthGrid, weekdayOrder } from '../monthGrid';

describe('monthGrid', () => {
  it('orders weekdays from any first day', () => {
    expect(weekdayOrder(7)).toEqual([7, 1, 2, 3, 4, 5, 6]);
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weekdayOrder(6)).toEqual([6, 7, 1, 2, 3, 4, 5]);
  });

  it('builds 42 cells starting on the chosen weekday (Sunday start, March 2026)', () => {
    const grid = buildMonthGrid(2026, 3, 7);
    expect(grid.cells).toHaveLength(42);
    // 1 March 2026 is a Sunday, so it is the first cell.
    expect(grid.cells[0]).toMatchObject({
      date: { year: 2026, month: 3, day: 1 },
      inMonth: true,
      weekday: 7,
    });
    expect(grid.cells[30].date).toEqual({ year: 2026, month: 3, day: 31 });
    expect(grid.cells[31]).toMatchObject({
      date: { year: 2026, month: 4, day: 1 },
      inMonth: false,
    });
    expect(grid.weekCount).toBe(5);
  });

  it('puts leading days from the previous month (Monday start, October 2026)', () => {
    const grid = buildMonthGrid(2026, 10, 1);
    // 1 Oct 2026 is a Thursday: Mon 28, Tue 29, Wed 30 Sep come first.
    expect(grid.cells[0]).toMatchObject({
      date: { year: 2026, month: 9, day: 28 },
      inMonth: false,
      weekday: 1,
    });
    expect(grid.cells[3]).toMatchObject({
      date: { year: 2026, month: 10, day: 1 },
      inMonth: true,
      weekday: 4,
    });
  });

  it('supports a Saturday start', () => {
    const grid = buildMonthGrid(2026, 10, 6);
    expect(grid.cells[0].weekday).toBe(6);
    expect(grid.cells.find((c) => c.inMonth)?.date.day).toBe(1);
  });

  it('counts six weeks when the month needs them', () => {
    // August 2026 starts on a Saturday: 6 rows with a Sunday start.
    expect(buildMonthGrid(2026, 8, 7).weekCount).toBe(6);
  });

  it('returns the same object for the same month (cached)', () => {
    expect(buildMonthGrid(2026, 5, 7)).toBe(buildMonthGrid(2026, 5, 7));
  });
});
