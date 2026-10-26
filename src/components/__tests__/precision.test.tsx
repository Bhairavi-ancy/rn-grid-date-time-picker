import { describe, expect, it, jest } from '@jest/globals';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { PickerValue } from '../../core/types';
import DateTimePicker from '../DateTimePicker';
import { DEFAULT_TOKENS } from '../theme/tokens';
import type { DateTimePickerProps, SheetRenderProps } from '../types';

// A sheet stand-in that just renders its body and footer.
const renderSheet = (p: SheetRenderProps) => (
  <View testID={`${p.testID}-view`}>
    {p.body}
    {p.footer}
  </View>
);

// Wednesday 21 Oct 2026, 12:00 in India.
const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));
const base: DateTimePickerProps = {
  type: 'date',
  value: '',
  onChange: () => {},
  timeZone: 'Asia/Kolkata',
  locale: 'en-IN',
  valueFormat: 'utc-midnight',
  dateFormat: 'dd-MM-yyyy',
  now,
  renderSheet,
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
const exists = (tree: ReactTestRenderer, id: string) => !!find(tree, id);
const press = (tree: ReactTestRenderer, id: string) =>
  act(() => find(tree, id).props.onPress());
const open = (tree: ReactTestRenderer) => press(tree, 'dp-trigger-field');
const textOf = (tree: ReactTestRenderer, id: string) =>
  find(tree, id)
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(''))
    .join(' ');
const styleOf = (tree: ReactTestRenderer, id: string) =>
  StyleSheet.flatten(find(tree, id).props.style);
const hasDays = (tree: ReactTestRenderer) =>
  tree.root.findAll(
    (n) =>
      typeof n.props.testID === 'string' && n.props.testID.startsWith('dp-day-')
  ).length > 0;

describe('precision: year', () => {
  it('opens on the year grid; a tapped year is saved as its first day', () => {
    const onChange = jest.fn();
    const tree = mount({ precision: 'year', onChange });
    open(tree);
    expect(exists(tree, 'dp-year-2026')).toBe(true);
    expect(hasDays(tree)).toBe(false);
    press(tree, 'dp-year-2027');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2027-01-01T00:00:00.000Z');
  });

  it('the field shows the year; reopening marks it picked and the current year', () => {
    const tree = mount({
      precision: 'year',
      value: '2027-01-01T00:00:00.000Z',
    });
    expect(textOf(tree, 'dp-trigger-field')).toContain('2027');
    open(tree);
    expect(find(tree, 'dp-year-2027').props.accessibilityState.selected).toBe(
      true
    );
    expect(styleOf(tree, 'dp-year-2026')).toMatchObject({
      borderWidth: 1,
      borderColor: DEFAULT_TOKENS.accent,
    });
  });

  it('a year is open when any day in it is', () => {
    const onChange = jest.fn();
    const tree = mount({
      precision: 'year',
      maxDate: { year: 2026, month: 6, day: 30 },
      onChange,
    });
    open(tree);
    expect(find(tree, 'dp-year-2027').props.disabled).toBe(true);
    press(tree, 'dp-year-2026');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-01-01T00:00:00.000Z');
  });
});

describe('precision: month', () => {
  it('opens on the month grid of the year; a tapped month is saved as its 1st', () => {
    const onChange = jest.fn();
    const tree = mount({ precision: 'month', onChange });
    open(tree);
    expect(textOf(tree, 'dp-title')).toContain('2026');
    expect(exists(tree, 'dp-month-3')).toBe(true);
    expect(hasDays(tree)).toBe(false);
    press(tree, 'dp-month-3');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-03-01T00:00:00.000Z');
  });

  it('the field shows "March 2026"; the current month is outlined', () => {
    const tree = mount({
      precision: 'month',
      value: '2026-03-01T00:00:00.000Z',
    });
    expect(textOf(tree, 'dp-trigger-field')).toContain('March 2026');
    open(tree);
    expect(find(tree, 'dp-month-3').props.accessibilityState.selected).toBe(
      true
    );
    expect(styleOf(tree, 'dp-month-10')).toMatchObject({
      borderColor: DEFAULT_TOKENS.accent,
    });
  });

  it('the year title opens the year grid and comes back to months, saving nothing', () => {
    const onChange = jest.fn();
    const tree = mount({ precision: 'month', onChange });
    open(tree);
    press(tree, 'dp-title');
    press(tree, 'dp-year-2027');
    expect(textOf(tree, 'dp-title')).toContain('2027');
    expect(exists(tree, 'dp-month-1')).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    press(tree, 'dp-month-1');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2027-01-01T00:00:00.000Z');
  });

  it('a month is open when any day in it is (min 15 Oct: October saves, September is closed)', () => {
    const onChange = jest.fn();
    const tree = mount({
      precision: 'month',
      minDate: { year: 2026, month: 10, day: 15 },
      onChange,
    });
    open(tree);
    expect(find(tree, 'dp-month-9').props.disabled).toBe(true);
    press(tree, 'dp-month-10');
    expect(find(tree, 'dp-confirm').props.disabled).toBe(false);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-01T00:00:00.000Z');
  });

  it('instant, inline, no footer: a month tap saves once; moving through years saves nothing', () => {
    // As a screen uses it: the saved value comes back in.
    const onChange = jest.fn();
    const Host = () => {
      const [value, setValue] = useState<PickerValue>('');
      return (
        <DateTimePicker
          {...base}
          precision="month"
          presentation="inline"
          commitMode="instant"
          footer={null}
          value={value}
          onChange={(v) => {
            onChange(v);
            setValue(v);
          }}
        />
      );
    };
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Host />);
    });
    expect(exists(tree, 'dp-confirm')).toBe(false);
    press(tree, 'dp-title');
    press(tree, 'dp-year-2025');
    expect(onChange).not.toHaveBeenCalled();
    press(tree, 'dp-month-4');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2025-04-01T00:00:00.000Z');
  });

  it('always Gregorian, even when a Hijri calendar is asked for', () => {
    const onChange = jest.fn();
    const tree = mount({
      precision: 'month',
      calendarSystem: 'hijri',
      onChange,
    });
    open(tree);
    expect(textOf(tree, 'dp-month-3')).toBe('March');
    press(tree, 'dp-month-3');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-03-01T00:00:00.000Z');
  });

  it('no typing: the fields show text even with allowTyping', () => {
    const tree = mount({
      precision: 'month',
      allowTyping: true,
      allowTriggerTyping: true,
      value: '2026-03-01T00:00:00.000Z',
    });
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    open(tree);
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  });

  it('only for single dates: a date-time or a range picks days as usual', () => {
    const datetime = mount({ precision: 'month', type: 'datetime' });
    open(datetime);
    expect(hasDays(datetime)).toBe(true);
    const range = mount({ precision: 'year', mode: 'range' });
    open(range);
    expect(hasDays(range)).toBe(true);
  });
});

describe('strings.rangeSeparator', () => {
  const value = {
    from: '2026-10-10T00:00:00.000Z',
    to: '2026-10-12T00:00:00.000Z',
  };
  it('joins the two ends of a range', () => {
    const tree = mount({
      mode: 'range',
      value,
      strings: { rangeSeparator: ' ↔ ' },
    });
    expect(textOf(tree, 'dp-trigger-field')).toContain(
      '10-10-2026 ↔ 12-10-2026'
    );
  });
  it('defaults to an en dash', () => {
    const tree = mount({ mode: 'range', value });
    expect(textOf(tree, 'dp-trigger-field')).toContain(
      '10-10-2026 – 12-10-2026'
    );
  });
});

describe('styles.fieldTextDisabled', () => {
  const textStyle = (tree: ReactTestRenderer) =>
    StyleSheet.flatten(
      find(tree, 'dp-trigger-field').findAllByType(Text)[0].props.style
    );
  it("colours a disabled field's value, not its placeholder", () => {
    const styles = { fieldTextDisabled: { color: '#1A1A1A' } };
    const filled = mount({
      disabled: true,
      styles,
      value: '2026-10-10T00:00:00.000Z',
    });
    expect(textStyle(filled).color).toBe('#1A1A1A');
    const empty = mount({ disabled: true, styles });
    expect(textStyle(empty).color).toBe(DEFAULT_TOKENS.disabledText);
  });
});
