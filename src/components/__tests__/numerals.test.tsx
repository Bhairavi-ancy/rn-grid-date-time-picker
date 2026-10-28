import { describe, expect, it, jest } from '@jest/globals';
import type { ReactElement } from 'react';
import { Text, TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import type { DateTimePickerProps } from '../types';

const now = () => new Date(Date.UTC(2026, 9, 27, 6, 30));

const mount = (el: ReactElement): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(el);
  });
  return tree;
};
const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(''));
const input = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAllByType(TextInput).find((i) => i.props.testID === id)!;

const picker = (props: Partial<DateTimePickerProps>) =>
  mount(
    <DateTimePicker
      type="datetime"
      presentation="inline"
      locale="ar-SA"
      now={now}
      timeZone="UTC"
      timeFormat="24h"
      dateFormat="dd/MM/yyyy"
      testID="dp"
      value="2026-10-25T09:30:00.000Z"
      onChange={() => {}}
      {...(props as object)}
    />
  );

describe('numerals', () => {
  it("'locale' draws the days, the year, the field and the time in Arabic digits", () => {
    const tree = picker({ numerals: 'locale', allowTyping: true });
    const shown = texts(tree);
    expect(shown).toContain('٢٧');
    expect(shown).toContain('٢٠٢٦');
    expect(input(tree, 'dp-value-segment-day').props.value).toBe('٢٥');
    expect(input(tree, 'dp-time-hour').props.value).toBe('٠٩');
    expect(input(tree, 'dp-time-minute').props.value).toBe('٣٠');
  });

  it('a Gregorian calendar keeps 0–9 by default in an Arabic locale', () => {
    const tree = picker({});
    expect(texts(tree)).toContain('27');
    expect(input(tree, 'dp-time-hour').props.value).toBe('09');
  });

  it("a Hijri calendar uses the language's digits by default; Gregorian keeps 0–9", () => {
    const hijri = texts(picker({ calendarSystem: 'hijri' }));
    expect(hijri).toContain('١٤٤٨');
    expect(hijri).toContain('١٦'); // 16 Jumada I is today
    const dual = texts(picker({ calendarSystem: 'dual' }));
    expect(dual).toContain('27');
    expect(dual).not.toContain('٢٧');
  });

  it("Hijri uses Arabic digits in any language; numerals='latin' or 'locale' overrides it", () => {
    expect(
      texts(picker({ calendarSystem: 'hijri', locale: 'en-US' }))
    ).toContain('١٤٤٨');
    expect(
      texts(
        picker({ calendarSystem: 'hijri', locale: 'en-US', numerals: 'locale' })
      )
    ).toContain('1448');
    expect(
      texts(picker({ calendarSystem: 'hijri', locale: 'fa-IR' }))
    ).toContain('١٤٤٨');
    const latin = picker({ calendarSystem: 'hijri', numerals: 'latin' });
    expect(texts(latin)).toContain('1448');
    expect(input(latin, 'dp-time-hour').props.value).toBe('09');
  });

  it('the on-screen field and renderField get the text in those digits; the value stays 0–9', () => {
    const onChange = jest.fn();
    const seen: string[] = [];
    const tree = mount(
      <DateTimePicker
        type="date"
        locale="ar-SA"
        numerals="locale"
        dateFormat="dd/MM/yyyy"
        now={now}
        value="2026-10-25"
        onChange={onChange}
        testID="dp"
      />
    );
    expect(texts(tree)).toContain('٢٥/١٠/٢٠٢٦');
    act(() =>
      tree.update(
        <DateTimePicker
          type="date"
          locale="ar-SA"
          numerals="locale"
          dateFormat="dd/MM/yyyy"
          now={now}
          value="2026-10-25"
          onChange={onChange}
          renderField={(state) => {
            seen.push(state.displayText);
            return null;
          }}
        />
      )
    );
    expect(seen.at(-1)).toBe('٢٥/١٠/٢٠٢٦');
  });

  it('typing into a box that shows Arabic digits still saves 0–9', () => {
    const onChange = jest.fn();
    const tree = picker({ numerals: 'locale', onChange });
    act(() => input(tree, 'dp-time-hour').props.onFocus());
    act(() => input(tree, 'dp-time-hour').props.onChangeText('١١'));
    act(() =>
      tree.root
        .findAll(
          (n) => n.props.testID === 'dp-confirm' && typeof n.type !== 'string'
        )[0]!
        .props.onPress()
    );
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25T11:30:00.000Z');
  });
});
