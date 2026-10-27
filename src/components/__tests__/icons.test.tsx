import { describe, expect, it, jest } from '@jest/globals';
import type { ComponentType, ReactElement } from 'react';
import { Pressable, Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { CalendarIcon, ClearIcon, type IconRenderProps } from '../../icons';
import DateTimePicker from '../DateTimePicker';
import ValueField, { type ValueFieldProps } from '../field/ValueField';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import {
  buildTokens,
  fontStyle,
  INTER_FONTS,
  SYSTEM_FONTS,
} from '../theme/tokens';
import type { DateTimePickerProps } from '../types';

const tokens = buildTokens({ accent: '#123456' });
const base: ValueFieldProps = {
  type: 'date',
  value: { date: { year: 2026, month: 10, day: 21 }, time: null },
  dateFormat: 'dd-MM-yyyy',
  timeFormat: '12h',
  allowClear: true,
  tokens,
  strings: DEFAULT_STRINGS,
  testID: 'dp',
};

const mount = (el: ReactElement): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(el);
  });
  return tree;
};
const field = (props: Partial<ValueFieldProps>) =>
  mount(<ValueField {...base} {...props} />);
const propsOf = (
  tree: ReactTestRenderer,
  type: ComponentType<IconRenderProps>
) => tree.root.findAllByType(type).map((n) => n.props as IconRenderProps);

describe('icons: colour, size and replacements', () => {
  it('draws the calendar and clear icons in the spot colours and sizes by default', () => {
    const tree = field({});
    expect(propsOf(tree, CalendarIcon)).toEqual([
      { color: '#123456', width: 18, height: 18, size: 18 },
    ]);
    expect(propsOf(tree, ClearIcon)).toEqual([
      { color: tokens.mutedText, width: 12, height: 12, size: 12 },
    ]);
  });

  it('iconProps sets colour, size, width and height per icon', () => {
    const tree = field({
      iconProps: {
        calendar: { color: '#FF0000', width: 24, height: 20 },
        clear: { color: '#00FF00', size: 16 },
      },
    });
    expect(propsOf(tree, CalendarIcon)).toEqual([
      { color: '#FF0000', width: 24, height: 20, size: 20 },
    ]);
    expect(propsOf(tree, ClearIcon)).toEqual([
      { color: '#00FF00', width: 16, height: 16, size: 16 },
    ]);
  });

  it('a disabled field uses disabledColor, or the theme disabled colour', () => {
    const own = field({
      disabled: true,
      iconProps: { calendar: { color: '#FF0000', disabledColor: '#CCCCCC' } },
    });
    expect(propsOf(own, CalendarIcon)[0]?.color).toBe('#CCCCCC');
    const themed = field({
      disabled: true,
      iconProps: { calendar: { color: '#FF0000' } },
    });
    expect(propsOf(themed, CalendarIcon)[0]?.color).toBe(tokens.disabledText);
  });

  it("an app's own icon component gets the same props, and null hides an icon", () => {
    const MyCalendar = jest.fn((_: IconRenderProps) => <Text>cal</Text>);
    const tree = field({
      icons: { calendar: MyCalendar, clear: null },
      iconProps: { calendar: { color: '#FF0000', size: 22 } },
    });
    expect(MyCalendar.mock.calls[0]?.[0]).toEqual({
      color: '#FF0000',
      width: 22,
      height: 22,
      size: 22,
    });
    expect(propsOf(tree, CalendarIcon)).toEqual([]);
    expect(tree.root.findAll((n) => n.props.testID === 'dp-clear')).toEqual([]);
    act(() => tree.update(<ValueField {...base} icons={{ calendar: null }} />));
    expect(tree.root.findAll((n) => n.props.testID === 'dp-icon')).toEqual([]);
  });

  it('iconProps reach the calendar header chevrons', () => {
    const tree = mount(
      <DateTimePicker
        type="date"
        value=""
        onChange={() => {}}
        presentation="inline"
        iconProps={{ chevronDown: { color: '#ABCDEF', size: 30 } }}
        testID="dp"
      />
    );
    const caret = tree.root.find(
      (n) =>
        typeof n.type !== 'string' &&
        n.props.color === '#ABCDEF' &&
        n.props.size === 30
    );
    expect(caret).toBeTruthy();
  });
});

describe('sheet.fieldIcon', () => {
  const picker = (props: Partial<DateTimePickerProps>) =>
    mount(
      <DateTimePicker
        type="date"
        value="2026-10-21"
        onChange={() => {}}
        timeZone="UTC"
        dateFormat="dd-MM-yyyy"
        presentation="inline"
        testID="dp"
        {...props}
      />
    );
  const has = (tree: ReactTestRenderer, id: string) =>
    tree.root.findAll((n) => n.props.testID === id).length > 0;

  it('hidden by default in the field above the calendar', () => {
    expect(has(picker({}), 'dp-value-icon')).toBe(false);
  });

  it('shows the calendar icon there, for one date and for a range', () => {
    const one = picker({ sheet: { fieldIcon: true } });
    expect(has(one, 'dp-value-icon')).toBe(true);
    expect(propsOf(one, CalendarIcon).length).toBeGreaterThan(0);
    const range = picker({
      mode: 'range',
      value: { from: '2026-10-21', to: '2026-10-23' },
      sheet: { fieldIcon: true },
    });
    expect(has(range, 'dp-value-icon')).toBe(true);
  });
});

describe('renderField: your own input', () => {
  it('gets the formatted text, open and clear', () => {
    const onChange = jest.fn();
    let tree!: ReactTestRenderer;
    const picker = (value: string) => (
      <DateTimePicker
        type="date"
        value={value}
        onChange={onChange}
        dateFormat="dd/mm/yyyy"
        testID="dp"
        renderField={(state) => (
          <>
            <Pressable testID="my-input" onPress={state.open}>
              <Text>{state.displayText || 'Pick a date'}</Text>
            </Pressable>
            {state.displayText ? (
              <Pressable testID="my-clear" onPress={state.clear} />
            ) : null}
          </>
        )}
      />
    );
    act(() => {
      tree = renderer.create(picker('2026-10-21'));
    });
    const texts = () =>
      tree.root
        .findAllByType(Text)
        .map((t) => [].concat(t.props.children).join(''));
    expect(texts()).toContain('21/10/2026');
    act(() =>
      tree.root.find((n) => n.props.testID === 'my-clear').props.onPress()
    );
    expect(onChange).toHaveBeenCalledWith('');
    act(() => tree.update(picker('')));
    expect(texts()).toContain('Pick a date');
    act(() =>
      tree.root.find((n) => n.props.testID === 'my-input').props.onPress()
    );
    expect(
      tree.root.findAll(
        (n) => n.props.testID === 'dp-sheet' && typeof n.type !== 'string'
      ).length
    ).toBeGreaterThan(0);
  });
});

describe('dateFormat prop', () => {
  const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));
  const shown = (props: Partial<DateTimePickerProps>) => {
    const tree = mount(
      <DateTimePicker
        type="date"
        value="2026-10-21"
        onChange={() => {}}
        now={now}
        timeZone="UTC"
        locale="en-US"
        testID="dp"
        {...(props as object)}
      />
    );
    return tree.root
      .findAllByType(Text)
      .map((t) => [].concat(t.props.children).join(''));
  };

  it("accepts lower-case 'dd/mm/yyyy'", () => {
    expect(shown({ dateFormat: 'dd/mm/yyyy' })).toContain('21/10/2026');
  });

  it('falls back to the locale order, with a warning, for a format it cannot use', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(shown({ dateFormat: 'dd MMM yyyy' })).toContain('10/21/2026');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('dd MMM yyyy'));
    warn.mockRestore();
  });
});

describe('fonts', () => {
  it('the text style keys reach the time boxes, AM / PM, the year cells and the Today button', () => {
    const font = { fontFamily: 'Mono', fontSize: 19 };
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DateTimePicker
          type="datetime"
          value=""
          onChange={() => {}}
          presentation="inline"
          showToday
          initialView="year"
          styles={{
            timeBoxText: font,
            ampmOptionText: font,
            yearCellText: font,
            todayButtonText: font,
          }}
          testID="dp"
        />
      );
    });
    const styled = tree.root.findAll(
      (n) =>
        typeof n.type === 'string' &&
        [n.props.style]
          .flat(Infinity)
          .some(
            (st: { fontFamily?: string } | undefined) =>
              st?.fontFamily === 'Mono'
          )
    );
    // Two time boxes, AM and PM, the year cells, Today.
    expect(styled.length).toBeGreaterThan(5);
  });

  it('the system font by default; fontFamily covers every weight; a per-weight family wins over it', () => {
    expect(fontStyle(buildTokens(), 'regular')).toEqual({
      fontWeight: '400',
    });
    expect(fontStyle(buildTokens(), 'semiBold')).toEqual({
      fontWeight: '600',
    });
    expect(fontStyle(buildTokens(INTER_FONTS), 'regular')).toEqual({
      fontFamily: 'Inter-Regular',
    });
    expect(fontStyle(buildTokens(INTER_FONTS), 'semiBold')).toEqual({
      fontFamily: 'Inter-SemiBold',
    });
    const one = buildTokens({ fontFamily: 'Inter' });
    expect(fontStyle(one, 'regular')).toEqual({
      fontFamily: 'Inter',
      fontWeight: '400',
    });
    expect(fontStyle(one, 'semiBold')).toEqual({
      fontFamily: 'Inter',
      fontWeight: '600',
    });
    const mixed = buildTokens({
      fontFamily: 'Inter',
      fontSemiBold: 'Inter-SemiBold',
    });
    expect(fontStyle(mixed, 'semiBold')).toEqual({
      fontFamily: 'Inter-SemiBold',
    });
    expect(fontStyle(buildTokens(INTER_FONTS), 'medium')).toEqual({
      fontFamily: 'Inter-Medium',
    });
    expect(
      fontStyle(buildTokens({ ...INTER_FONTS, ...SYSTEM_FONTS }), 'medium')
    ).toEqual({ fontWeight: '500' });
  });
});
