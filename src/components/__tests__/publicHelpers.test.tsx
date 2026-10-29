import { describe, expect, it } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import DateTimePicker, {
  arabicDigits,
  DEFAULT_STRINGS,
  DEFAULT_TOKENS,
  hijriDateText,
  type PickerState,
  type PickerStrings,
  type ThemeTokens,
} from '../../index';

const now = () => new Date(Date.UTC(2026, 9, 27, 6, 30));

describe('exported Hijri helpers', () => {
  it('write the same text as the field', () => {
    let state!: PickerState;
    act(() => {
      renderer.create(
        <DateTimePicker
          type="date"
          value="2026-10-26"
          onChange={() => {}}
          calendarSystem="hijri"
          locale="en-US"
          timeZone="UTC"
          now={now}
          renderField={(p) => {
            state = p;
            return null;
          }}
        />
      );
    });
    const chip = arabicDigits(
      hijriDateText({ year: 2026, month: 10, day: 26 }, 'ar-SA') ?? ''
    );
    expect(chip).toBe(state.displayText);
    expect(chip).toContain('هـ');
  });

  it('arabicDigits writes 0–9 as Arabic digits', () => {
    expect(arabicDigits('26/10/2026')).toBe('٢٦/١٠/٢٠٢٦');
  });
});

describe('1.0.0-shaped strings and tokens', () => {
  it('still type-check without the keys added in 1.1.0', () => {
    // Full objects as a 1.0.0 app wrote them, without the keys added in 1.1.0.
    const v1Strings: Omit<
      Required<PickerStrings>,
      | 'calendarGregorian'
      | 'calendarHijri'
      | 'calendarDual'
      | 'a11yCalendarSystem'
      | 'a11yClose'
    > = DEFAULT_STRINGS;
    const v1Tokens: Omit<Required<ThemeTokens>, 'outsideText'> = DEFAULT_TOKENS;
    const strings: PickerStrings = { ...v1Strings };
    const theme: ThemeTokens = { ...v1Tokens };
    expect(strings.confirm).toBe(DEFAULT_STRINGS.confirm);
    expect(theme.accent).toBe(DEFAULT_TOKENS.accent);
  });
});
