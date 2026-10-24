import { describe, expect, it } from '@jest/globals';
import { dstStatus } from '../zoned';

describe('dstStatus', () => {
  it('flags a skipped time as a gap and a repeated time as an overlap', () => {
    const gap = {
      date: { year: 2026, month: 3, day: 8 },
      time: { hour: 2, minute: 30 },
    };
    const overlap = {
      date: { year: 2026, month: 11, day: 1 },
      time: { hour: 1, minute: 30 },
    };
    expect(dstStatus(gap, 'America/New_York')).toBe('gap');
    expect(dstStatus(overlap, 'America/New_York')).toBe('overlap');
    expect(
      dstStatus(
        {
          date: { year: 2026, month: 10, day: 21 },
          time: { hour: 10, minute: 0 },
        },
        'Asia/Kolkata'
      )
    ).toBe('ok');
  });
});
