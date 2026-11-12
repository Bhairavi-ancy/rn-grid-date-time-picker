import { describe, expect, it } from '@jest/globals';
import type { ReactElement } from 'react';
import renderer, { act } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import type { DateTimePickerProps } from '../types';

const now = () => new Date(Date.UTC(2026, 9, 27, 6, 30));

/** The text the on-screen field shows, read through renderField. */
const fieldText = (props: Partial<DateTimePickerProps>): string => {
  const seen: string[] = [];
  const el: ReactElement = (
    <DateTimePicker
      type="date"
      locale="en-US"
      dateFormat="dd-MM-yyyy"
      calendarSystem="dual"
      dualDefaultTab="hijri"
      timeZone="UTC"
      now={now}
      value="2026-10-25"
      onChange={() => {}}
      renderField={(state) => {
        seen.push(state.displayText);
        return null;
      }}
      {...(props as object)}
    />
  );
  act(() => {
    renderer.create(el);
  });
  return seen.at(-1) ?? '';
};

describe('fieldCalendar', () => {
  it("'picked' (default) writes a value from the Hijri tab as Hijri text", () => {
    const text = fieldText({});
    expect(text).not.toBe('25-10-2026');
    expect(text).not.toMatch(/[0-9]/);
  });

  it("'gregory' writes the same value in dateFormat with 0–9", () => {
    expect(fieldText({ fieldCalendar: 'gregory' })).toBe('25-10-2026');
  });

  it("'gregory' keeps the strings' AM / PM for a date-time", () => {
    expect(
      fieldText({
        fieldCalendar: 'gregory',
        type: 'datetime',
        timeFormat: '12h',
        value: '2026-10-25T09:30:00.000Z',
      })
    ).toBe('25-10-2026 09:30 AM');
  });
});
