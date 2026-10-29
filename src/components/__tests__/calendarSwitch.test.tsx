import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import * as calendarSystem from '../../core/calendarSystem';
import * as calendarStyles from '../calendar/calendarStyles';
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

describe('the calendar a value counts as picked in (regressions)', () => {
  /** A sheet picker the test drives through renderField's state. */
  const sheet = (props: Partial<DateTimePickerProps>) => {
    const ref: { state?: PickerState } = {};
    const tree = mount({
      presentation: 'sheet',
      commitMode: 'confirm',
      renderSheet: (p) => <View>{p.body}</View>,
      renderField: (p) => {
        ref.state = p;
        return null;
      },
      ...props,
    });
    return { tree, state: () => ref.state! };
  };

  it('switching calendars and closing without Confirm leaves the field as it was', () => {
    const { tree, state } = sheet({
      calendarSwitch: true,
      value: '2026-10-20',
    });
    expect(state().displayText).toBe('20/10/2026');
    act(() => state().open());
    press(tree, 'dp-calendar-switch-hijri');
    act(() => state().close());
    expect(state().displayText).toBe('20/10/2026');
  });

  /** A parent that feeds the switch's choice back as the calendarSystem prop. */
  const Controlled = (props: Partial<DateTimePickerProps>) => {
    const [system, setSystem] =
      useState<DateTimePickerProps['calendarSystem']>('gregory');
    return (
      <DateTimePicker
        {...base}
        presentation="sheet"
        commitMode="confirm"
        renderSheet={(p) => <View>{p.body}</View>}
        calendarSwitch
        calendarSystem={system}
        onCalendarSystemChange={setSystem}
        {...props}
      />
    );
  };

  it('controlled switch: switching and closing without Confirm leaves the field as it was', () => {
    const ref: { state?: PickerState } = {};
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <Controlled
          value="2026-10-20"
          renderField={(p) => {
            ref.state = p;
            return null;
          }}
        />
      );
    });
    act(() => ref.state!.open());
    press(tree, 'dp-calendar-switch-hijri');
    act(() => ref.state!.close());
    expect(ref.state!.displayText).toBe('20/10/2026');
  });

  it('controlled switch: a range started in one calendar starts over in the other', () => {
    const onChange = jest.fn();
    const ref: { state?: PickerState } = {};
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <Controlled
          mode="range"
          value={{ from: '', to: '' }}
          onChange={onChange}
          renderField={(p) => {
            ref.state = p;
            return null;
          }}
        />
      );
    });
    act(() => ref.state!.open());
    tap(tree, 20);
    press(tree, 'dp-calendar-switch-hijri');
    tap(tree, 25);
    expect(ref.state!.canConfirm).toBe(false);
    act(() => ref.state!.confirm());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a new calendarSystem prop while picking starts the selection over', () => {
    const onChange = jest.fn();
    const props = {
      ...base,
      mode: 'range' as const,
      commitMode: 'confirm' as const,
      value: { from: '', to: '' },
      onChange,
    };
    const tree = mount(props);
    tap(tree, 20);
    act(() =>
      tree.update(<DateTimePicker {...props} calendarSystem="hijri" />)
    );
    tap(tree, 25);
    press(tree, 'dp-confirm');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('typing in the field keeps the calendar the saved date was picked in', () => {
    const onChange = jest.fn();
    const Parent = () => {
      const [value, setValue] = useState<DateTimePickerProps['value']>('');
      return (
        <DateTimePicker
          {...base}
          presentation="sheet"
          commitMode="confirm"
          renderSheet={(p) => (
            <View>
              {p.body}
              {p.footer}
            </View>
          )}
          calendarSystem="dual"
          allowFieldTyping
          value={value}
          onChange={(v, info) => {
            onChange(v, info);
            setValue(v);
          }}
        />
      );
    };
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Parent />);
    });
    press(tree, 'dp-trigger-icon');
    press(tree, 'dp-dual-tabs-hijri');
    tap(tree, 20);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-20', {
      calendarSystem: 'hijri',
    });
    const seg = (key: string) =>
      tree.root
        .findAllByType(TextInput)
        .find((i) => i.props.testID === `dp-trigger-segment-${key}`)!;
    act(() => seg('day').props.onFocus());
    act(() => seg('day').props.onChangeText('25'));
    // Two digits move focus on to the month; leaving it ends the typing.
    act(() => seg('month').props.onBlur());
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25', {
      calendarSystem: 'hijri',
    });
  });

  it('a new calendarSystem prop moves an untouched value to that calendar, field and grid alike', () => {
    const tree = mount({ value: '2026-10-20' });
    act(() =>
      tree.update(
        <DateTimePicker {...base} value="2026-10-20" calendarSystem="hijri" />
      )
    );
    expect(isSelected(tree, 20)).toBe(true);
    expect(texts(tree)).toContain('٩ جمادى الأولى ١٤٤٨ هـ');
  });

  it('a value handed back written another way keeps its calendar, and is not saved again', () => {
    const onChange = jest.fn();
    const Parent = () => {
      const [value, setValue] = useState<DateTimePickerProps['value']>({
        from: '',
        to: '',
      });
      return (
        <DateTimePicker
          {...base}
          mode="range"
          calendarSystem="dual"
          dualDefaultTab="hijri"
          value={value}
          onChange={(v, info) => {
            onChange(v, info);
            // The parent stores the range with its keys the other way round.
            const r = v as { from: string; to: string };
            setValue({ to: r.to, from: r.from } as never);
          }}
        />
      );
    };
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Parent />);
    });
    tap(tree, 20);
    tap(tree, 25);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(
      { from: '2026-10-20', to: '2026-10-25' },
      { calendarSystem: 'hijri' }
    );
    expect(isSelected(tree, 20)).toBe(true);
  });

  it('instant mode saves the same day picked in the other calendar', () => {
    const onChange = jest.fn();
    const tree = mount({
      calendarSystem: 'dual',
      value: '2026-10-20',
      onChange,
    });
    press(tree, 'dp-dual-tabs-hijri');
    tap(tree, 20);
    expect(onChange).toHaveBeenLastCalledWith('2026-10-20', {
      calendarSystem: 'hijri',
    });
  });

  it('typing keeps the calendar a selection was picked in', () => {
    const tree = mount({
      calendarSystem: 'dual',
      mode: 'range',
      commitMode: 'confirm',
      range: { layout: 'fromTo' },
      allowTyping: true,
    });
    tap(tree, 20);
    press(tree, 'dp-dual-tabs-hijri');
    const typeBox = (id: string, text: string) => {
      const input = tree.root
        .findAllByType(TextInput)
        .find((i) => i.props.testID === id)!;
      act(() => input.props.onFocus());
      act(() => input.props.onChangeText(text));
    };
    typeBox('dp-to-segment-day', '25');
    typeBox('dp-to-segment-month', '10');
    typeBox('dp-to-segment-year', '2026');
    // Still a Gregorian selection: hidden in the Hijri tab, back in the Gregorian one.
    expect(isSelected(tree, 25)).toBe(false);
    press(tree, 'dp-dual-tabs-gregory');
    expect(isSelected(tree, 20)).toBe(true);
    expect(isSelected(tree, 25)).toBe(true);
  });
});

describe('a tap redraws only what changed', () => {
  it('not every day cell, in either calendar', () => {
    for (const system of ['gregory', 'hijri'] as const)
      for (const mode of ['single', 'range'] as const) {
        const tree = mount({
          calendarSystem: system,
          mode,
          commitMode: 'confirm',
        });
        tap(tree, 20);
        // Each part builds its styles as it draws: the calendar, its header
        // and grid, and the cells whose selection changed.
        const draws = jest.spyOn(calendarStyles, 'buildCalendarStyles');
        tap(tree, 22);
        expect(draws.mock.calls.length).toBeLessThanOrEqual(10);
        draws.mockRestore();
      }
  });
});

describe('accessibility of custom parts', () => {
  it('a custom month chip keeps its role, name, state and testID', () => {
    const tree = mount({
      maxDate: { year: 2026, month: 11, day: 30 },
      renderMonthChip: (month) => <Text>{month}</Text>,
    });
    const chip = find(tree, 'dp-chip-12');
    expect(chip.props.accessibilityRole).toBe('button');
    expect(chip.props.accessibilityLabel).toBe('December');
    expect(chip.props.accessibilityState).toEqual({
      selected: false,
      disabled: true,
    });
  });

  it('range time boxes say which end they are', () => {
    const tree = mount({ type: 'datetime', mode: 'range' });
    const labels = tree.root
      .findAllByType(TextInput)
      .map((i) => i.props.accessibilityLabel as string)
      .filter((l) => /Hour/.test(l));
    expect(labels).toEqual(['Start time, Hour', 'End time, Hour']);
  });
});
