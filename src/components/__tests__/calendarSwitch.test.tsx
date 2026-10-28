import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import * as calendarSystem from '../../core/calendarSystem';
import DateTimePicker from '../DateTimePicker';
import type { DateTimePickerProps, PickerState } from '../types';

// Tuesday 27 Oct 2026 = 16 Jumada I 1448.
const now = () => new Date(Date.UTC(2026, 9, 27, 6, 30));
const base: DateTimePickerProps = {
  type: 'date',
  value: '',
  onChange: () => {},
  presentation: 'inline',
  commitMode: 'instant',
  locale: 'en-US',
  timeZone: 'UTC',
  dateFormat: 'dd/MM/yyyy',
  now,
  testID: 'dp',
};

const mount = (props: Partial<DateTimePickerProps>): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<DateTimePicker {...base} {...props} />);
  });
  return tree;
};
const find = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAll(
    (n) => n.props.testID === id && typeof n.type !== 'string'
  )[0];
const press = (tree: ReactTestRenderer, id: string) =>
  act(() => find(tree, id).props.onPress());
const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(''));
const dayCell = (tree: ReactTestRenderer, d: number, m = 10) =>
  tree.root.findAll(
    (n) =>
      n.props.testID === `dp-day-2026-${m}-${d}` &&
      n.props.accessibilityRole === 'button' &&
      typeof n.type !== 'string'
  )[0];
const tap = (tree: ReactTestRenderer, d: number, m = 10) =>
  act(() => dayCell(tree, d, m).props.onPress());
const isSelected = (tree: ReactTestRenderer, d: number, m = 10) =>
  !!dayCell(tree, d, m)?.props.accessibilityState?.selected;
const checked = (tree: ReactTestRenderer, id: string) =>
  find(tree, id).props.accessibilityState;
/** The Hijri grid shows Hijri years in its header, in Arabic digits. */
const showsHijri = (tree: ReactTestRenderer) => texts(tree).includes('١٤٤٨');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('calendar switch', () => {
  it('is off by default', () => {
    const tree = mount({});
    expect(find(tree, 'dp-calendar-switch')).toBeUndefined();
    expect(find(tree, 'dp-dual-tabs')).toBeUndefined();
  });

  it('shows Gregorian, Hijri and Dual, and changes the calendar', () => {
    const onCalendarSystemChange = jest.fn();
    const tree = mount({ calendarSwitch: true, onCalendarSystemChange });
    expect(checked(tree, 'dp-calendar-switch-gregory')).toEqual({
      checked: true,
    });
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Gregorian', 'Hijri', 'Dual'])
    );
    expect(showsHijri(tree)).toBe(false);

    press(tree, 'dp-calendar-switch-hijri');
    expect(onCalendarSystemChange).toHaveBeenCalledWith('hijri');
    expect(checked(tree, 'dp-calendar-switch-hijri')).toEqual({
      checked: true,
    });
    expect(showsHijri(tree)).toBe(true);
    expect(find(tree, 'dp-dual-tabs')).toBeUndefined();
  });

  it('shows only the listed calendars, in order, starting on the first when calendarSystem is not listed', () => {
    const tree = mount({ calendarSwitch: ['hijri', 'dual'] });
    const ids = tree.root
      .findAll(
        (n) =>
          typeof n.props.testID === 'string' &&
          n.props.testID.startsWith('dp-calendar-switch-') &&
          typeof n.type !== 'string'
      )
      .map((n) => n.props.testID);
    expect([...new Set(ids)]).toEqual([
      'dp-calendar-switch-hijri',
      'dp-calendar-switch-dual',
    ]);
    expect(showsHijri(tree)).toBe(true);
  });

  it('takes its labels from strings, and each part its own style', () => {
    const tree = mount({
      calendarSwitch: true,
      calendarSystem: 'hijri',
      strings: { calendarGregorian: 'ميلادي', calendarHijri: 'هجري' },
      styles: {
        calendarSwitchSegment: { height: 50 },
        calendarSwitchSegmentSelected: { backgroundColor: 'gold' },
      },
    });
    expect(texts(tree)).toEqual(expect.arrayContaining(['ميلادي', 'هجري']));
    const style = (id: string) => [find(tree, id).props.style].flat(9);
    expect(style('dp-calendar-switch-gregory')).toContainEqual({ height: 50 });
    expect(style('dp-calendar-switch-gregory')).not.toContainEqual({
      backgroundColor: 'gold',
    });
    expect(style('dp-calendar-switch-hijri')).toContainEqual({
      backgroundColor: 'gold',
    });
  });

  it('renderCalendarSwitch replaces the built-in switch', () => {
    let seen: { systems: string[]; selected: string } | null = null;
    let choose: ((s: 'hijri') => void) | null = null;
    const tree = mount({
      calendarSwitch: true,
      renderCalendarSwitch: (p) => {
        seen = { systems: p.systems, selected: p.selected };
        choose = p.onSelect;
        return null;
      },
    });
    expect(find(tree, 'dp-calendar-switch')).toBeUndefined();
    expect(seen).toEqual({
      systems: ['gregory', 'hijri', 'dual'],
      selected: 'gregory',
    });
    act(() => choose!('hijri'));
    expect(showsHijri(tree)).toBe(true);
  });

  it('is hidden for month picks and when the platform has no Hijri calendar', () => {
    const month = mount({ calendarSwitch: true, precision: 'month' });
    expect(find(month, 'dp-calendar-switch')).toBeUndefined();
    jest.spyOn(calendarSystem, 'isHijriSupported').mockReturnValue(false);
    const noHijri = mount({ calendarSwitch: true });
    expect(find(noHijri, 'dp-calendar-switch')).toBeUndefined();
  });
});

describe('dual calendar', () => {
  it('shows Gregorian and Hijri tabs, opening on Gregorian', () => {
    const tree = mount({ calendarSystem: 'dual' });
    expect(checked(tree, 'dp-dual-tabs-gregory')).toEqual({ selected: true });
    expect(showsHijri(tree)).toBe(false);
    press(tree, 'dp-dual-tabs-hijri');
    expect(showsHijri(tree)).toBe(true);
  });

  it('dualDefaultTab picks the tab it opens on', () => {
    const tree = mount({ calendarSystem: 'dual', dualDefaultTab: 'hijri' });
    expect(checked(tree, 'dp-dual-tabs-hijri')).toEqual({ selected: true });
    expect(showsHijri(tree)).toBe(true);
  });

  it('a new dualDefaultTab moves an inline picker to that tab', () => {
    const tree = mount({ calendarSystem: 'dual' });
    act(() =>
      tree.update(
        <DateTimePicker
          {...base}
          calendarSystem="dual"
          dualDefaultTab="hijri"
        />
      )
    );
    expect(showsHijri(tree)).toBe(true);
  });

  it('the selection shows only in the tab it was picked in; a pick in the other tab replaces it', () => {
    const onChange = jest.fn();
    const tree = mount({ calendarSystem: 'dual', onChange });
    tap(tree, 20);
    expect(isSelected(tree, 20)).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith('2026-10-20', {
      calendarSystem: 'gregory',
    });

    press(tree, 'dp-dual-tabs-hijri');
    expect(isSelected(tree, 20)).toBe(false);
    tap(tree, 25);
    expect(isSelected(tree, 25)).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25', {
      calendarSystem: 'hijri',
    });

    press(tree, 'dp-dual-tabs-gregory');
    expect(isSelected(tree, 20)).toBe(false);
    expect(isSelected(tree, 25)).toBe(false);
  });

  it('a range started in one tab starts over when a day is tapped in the other', () => {
    const tree = mount({ calendarSystem: 'dual', mode: 'range' });
    tap(tree, 20);
    press(tree, 'dp-dual-tabs-hijri');
    tap(tree, 25);
    tap(tree, 28);
    expect(isSelected(tree, 25)).toBe(true);
    expect(isSelected(tree, 28)).toBe(true);
    expect(isSelected(tree, 20)).toBe(false);
  });

  it('the other tab opens on the days the first one showed', () => {
    const tree = mount({ calendarSystem: 'dual' });
    press(tree, 'dp-chip-12');
    press(tree, 'dp-dual-tabs-hijri');
    // Mid-December 2026 is in Rajab 1448.
    expect(dayCell(tree, 15, 12)).toBeDefined();
  });
});

describe('the calendar a date was picked in', () => {
  it('the field writes a Hijri pick as a Hijri date, a Gregorian one as dateFormat', () => {
    let state!: PickerState;
    const Controlled = () => {
      const [value, setValue] = useState('');
      return (
        <DateTimePicker
          {...base}
          presentation="sheet"
          calendarSystem="dual"
          dualDefaultTab="hijri"
          value={value}
          onChange={(v) => setValue(v as string)}
          renderSheet={(p) => <View>{p.body}</View>}
          renderField={(p) => {
            state = p;
            return null;
          }}
        />
      );
    };
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Controlled />);
    });
    act(() => state.open());
    tap(tree, 20);
    expect(state.displayText).toBe('٩ جمادى الأولى ١٤٤٨ هـ');
    expect(texts(tree)).toContain('٩ جمادى الأولى ١٤٤٨ هـ');

    press(tree, 'dp-dual-tabs-gregory');
    tap(tree, 21);
    expect(state.displayText).toBe('21/10/2026');
    // Reopened, it starts on the Hijri tab with nothing selected there.
    act(() => state.close());
    act(() => state.open());
    expect(isSelected(tree, 21)).toBe(false);
    expect(state.displayText).toBe('21/10/2026');
  });

  it('a value from outside counts as picked in the calendar the picker opens on', () => {
    const hijri = mount({ calendarSystem: 'hijri', value: '2026-10-20' });
    expect(isSelected(hijri, 20)).toBe(true);
    expect(texts(hijri)).toContain('٩ جمادى الأولى ١٤٤٨ هـ');
    const dual = mount({ calendarSystem: 'dual', value: '2026-10-20' });
    expect(isSelected(dual, 20)).toBe(true);
    expect(texts(dual)).toContain('20/10/2026');
  });

  it('a Gregorian-only picker calls onChange with the value alone, as before', () => {
    const onChange = jest.fn();
    const tree = mount({ onChange });
    tap(tree, 20);
    expect(onChange.mock.calls[0]).toEqual(['2026-10-20']);
  });

  it("Gregorian shows 0–9 and Hijri the language's digits, in the calendar and in the field", () => {
    const tree = mount({ calendarSystem: 'dual', locale: 'ar-SA' });
    const field = () =>
      texts(tree).find((t) => t.includes('/') || t.includes('هـ'));
    expect(texts(tree)).toContain('27');
    expect(texts(tree)).not.toContain('٢٧');
    tap(tree, 20);
    expect(field()).toBe('20/10/2026');

    press(tree, 'dp-dual-tabs-hijri');
    expect(texts(tree)).toContain('١٦');
    expect(texts(tree)).not.toContain('16');
    // The Gregorian pick keeps its 0–9 text while the Hijri tab shows.
    expect(field()).toBe('20/10/2026');
    tap(tree, 21);
    expect(field()).toBe('١٠ جمادى الأولى ١٤٤٨ هـ');
  });

  it('numerals sets the digits of both calendars', () => {
    const tree = mount({
      calendarSystem: 'dual',
      locale: 'ar-SA',
      numerals: 'locale',
    });
    expect(texts(tree)).toContain('٢٧');
    press(tree, 'dp-dual-tabs-hijri');
    const latin = mount({
      calendarSystem: 'hijri',
      locale: 'ar-SA',
      numerals: 'latin',
    });
    expect(texts(latin)).toContain('1448');
  });
});

describe('a Hijri calendar is written in Arabic', () => {
  it('whatever the app language: month and weekday names, digits and the field', () => {
    const tree = mount({ calendarSystem: 'dual', locale: 'en-US' });
    expect(texts(tree)).toContain('Oct');
    expect(texts(tree)).toContain('Su');
    press(tree, 'dp-dual-tabs-hijri');
    const shown = texts(tree);
    expect(shown).toContain('جمادى الأولى');
    expect(shown).toContain('الأحد');
    expect(shown).not.toContain('Su');
    expect(shown).toContain('١٤٤٨');
    tap(tree, 20);
    expect(shown.concat(texts(tree))).toContain('٩ جمادى الأولى ١٤٤٨ هـ');
    // Screen readers hear the Hijri date.
    expect(dayCell(tree, 20).props.accessibilityLabel).toContain(
      'جمادى الأولى'
    );
    // The tabs and buttons keep the app's strings.
    expect(texts(tree)).toContain('Gregorian');
  });

  it('hijriLocale writes it in another language', () => {
    const tree = mount({
      calendarSystem: 'hijri',
      locale: 'ar-SA',
      hijriLocale: 'en-US',
      value: '2026-10-20',
    });
    expect(texts(tree)).toContain('Jumada I');
    expect(texts(tree)).toContain('Jumada I ٩, ١٤٤٨ AH');
  });
});

describe('styling the tabs and the title', () => {
  it('each part of the dual tabs takes its own style', () => {
    const tree = mount({
      calendarSystem: 'dual',
      styles: {
        dualTabs: { borderBottomWidth: 0 },
        dualTab: { minHeight: 36 },
        dualTabSelected: { backgroundColor: '#F3E8FF' },
        dualTabTextSelected: { color: 'purple' },
      },
    });
    const style = (id: string) =>
      StyleSheet.flatten(find(tree, id).props.style);
    const box = tree.root.findAll(
      (n) => n.props.testID === 'dp-dual-tabs' && n.type === View
    )[0]!;
    expect(StyleSheet.flatten(box.props.style)).toMatchObject({
      borderBottomWidth: 0,
    });
    expect(style('dp-dual-tabs-gregory')).toMatchObject({
      minHeight: 36,
      backgroundColor: '#F3E8FF',
    });
    expect(style('dp-dual-tabs-hijri').backgroundColor).toBeUndefined();
  });

  it('the sheet title has 24 pt above it, and styles.header changes it', () => {
    const header = (props: Partial<DateTimePickerProps>) => {
      let state!: PickerState;
      const tree = mount({
        presentation: 'sheet',
        renderSheet: (p) => <View>{p.body}</View>,
        renderField: (p) => {
          state = p;
          return null;
        },
        ...props,
      });
      act(() => state.open());
      const title = tree.root.findAll(
        (n) => n.props.accessibilityRole === 'header' && n.type === Text
      )[0]!;
      return StyleSheet.flatten(title.parent!.props.style);
    };
    expect(header({}).paddingTop).toBe(24);
    expect(header({ styles: { header: { paddingTop: 16 } } }).paddingTop).toBe(
      16
    );
  });
});
