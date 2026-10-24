import { describe, expect, it, jest } from '@jest/globals';
import { createElement } from 'react';
import { Text, TextInput, View, type ViewProps } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import ValueField, { type ValueFieldProps } from '../field/ValueField';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import { buildTokens } from '../theme/tokens';
import type { InstructionRenderProps, LabelRenderProps } from '../types';

// Stand-ins for an app's own label and instruction, passed through renderLabel /
// renderInstruction. They show the same content as the built-in ones.
const renderLabel = (p: LabelRenderProps) => (
  <View testID={p.testID}>
    <Text>{p.label}</Text>
    {p.isMandatory ? <Text>{' *'}</Text> : null}
    {p.helperText
      ? createElement(View, {
          testID: 'help-tooltip',
          helperText: p.helperText,
        } as ViewProps)
      : null}
  </View>
);
const renderInstruction = (p: InstructionRenderProps) => (
  <Text testID="info-field">{p.instruction}</Text>
);

const strings = DEFAULT_STRINGS;
const tokens = buildTokens({ accent: '#123456' });
const base: ValueFieldProps = {
  type: 'date',
  value: null,
  dateFormat: 'dd-MM-yyyy',
  timeFormat: '12h',
  renderLabel,
  renderInstruction,
  tokens,
  strings,
  testID: 'dp',
};

const mount = (props: Partial<ValueFieldProps>): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<ValueField {...base} {...props} />);
  });
  return tree;
};

const byTestId = (tree: ReactTestRenderer, id: string) =>
  tree.root.find((n) => n.props.testID === id && typeof n.type !== 'string');
const queryTestId = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => n.props.testID === id);
const texts = (tree: ReactTestRenderer): string[] =>
  tree.root
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(''));

describe('ValueField: label, helper text and instruction (render props)', () => {
  it('passes the label, helper text and instruction to renderLabel / renderInstruction', () => {
    const tree = mount({
      label: 'Due date',
      isMandatory: true,
      helperText: 'Shown on invoices',
      instruction: 'Weekdays only',
      errorMessage: 'Required',
    });
    expect(texts(tree)).toEqual(expect.arrayContaining(['Due date', ' *']));
    // Not printed as text under the field any more.
    expect(texts(tree)).not.toContain('Shown on invoices');
    expect(queryTestId(tree, 'help-tooltip')[0].props.helperText).toBe(
      'Shown on invoices'
    );
    expect(queryTestId(tree, 'info-field')[0].props.children).toBe(
      'Weekdays only'
    );
    expect(texts(tree)).toContain('Required');
  });

  it('shows no label row when there is neither label nor helper text', () => {
    expect(queryTestId(mount({}), 'dp-label')).toHaveLength(0);
  });
});

describe('ValueField: display mode', () => {
  it('shows the value in the locale format and opens the picker on tap', () => {
    const onPress = jest.fn();
    const tree = mount({
      value: { date: { year: 2026, month: 10, day: 21 }, time: null },
      onPress,
      label: 'Due date',
      isMandatory: true,
    });
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Due date', ' *', '21-10-2026'])
    );
    act(() => byTestId(tree, 'dp-field').props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a placeholder when empty', () => {
    expect(texts(mount({ type: 'datetime' }))).toContain('DD-MM-YYYY hh:mm AM');
    expect(texts(mount({ placeholder: 'Pick a day' }))).toContain('Pick a day');
  });

  it('shows the × only with a value, and calls onClear', () => {
    const onClear = jest.fn();
    expect(
      queryTestId(mount({ allowClear: true, onClear }), 'dp-clear')
    ).toHaveLength(0);
    const tree = mount({
      allowClear: true,
      onClear,
      value: { date: { year: 2026, month: 10, day: 21 }, time: null },
    });
    act(() => byTestId(tree, 'dp-clear').props.onPress());
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('never shows the × or opens when disabled or read-only', () => {
    const onPress = jest.fn();
    const value = { date: { year: 2026, month: 10, day: 21 }, time: null };
    expect(
      queryTestId(
        mount({ allowClear: true, value, disabled: true }),
        'dp-clear'
      )
    ).toHaveLength(0);
    const tree = mount({ value, readOnly: true, onPress, allowClear: true });
    expect(byTestId(tree, 'dp-field').props.disabled).toBe(true);
    expect(queryTestId(tree, 'dp-icon')).toHaveLength(0);
  });

  it('shows the screen error below the field, but not when disabled', () => {
    expect(texts(mount({ errorMessage: 'Required' }))).toContain('Required');
    expect(
      texts(mount({ errorMessage: 'Required', disabled: true }))
    ).not.toContain('Required');
  });
});

describe('ValueField: typed mode (date + time segments)', () => {
  it('turns typed digits into a value (AM until switched) and the AM/PM tap into PM', () => {
    const onTyped = jest.fn();
    const tree = mount({ type: 'datetime', allowTyping: true, onTyped });
    const type = (key: string, text: string) => {
      const input = tree.root
        .findAllByType(TextInput)
        .find((i) => i.props.testID === `dp-segment-${key}`);
      act(() => input?.props.onFocus());
      act(() => input?.props.onChangeText(text));
    };
    type('day', '21');
    type('month', '10');
    type('year', '2026');
    type('hour', '09');
    type('minute', '30');
    expect(onTyped).toHaveBeenLastCalledWith({
      value: {
        date: { year: 2026, month: 10, day: 21 },
        time: { hour: 9, minute: 30 },
      },
      errors: [],
      isEmpty: false,
    });
    expect(texts(tree)).toContain(DEFAULT_STRINGS.am);
    act(() => byTestId(tree, 'dp-segment-period').props.onPress());
    expect(onTyped).toHaveBeenLastCalledWith(
      expect.objectContaining({
        value: {
          date: { year: 2026, month: 10, day: 21 },
          time: { hour: 21, minute: 30 },
        },
      })
    );
  });

  it('shows the typing error below the field once the user leaves it', () => {
    const tree = mount({ allowTyping: true });
    const day = tree.root
      .findAllByType(TextInput)
      .find((i) => i.props.testID === 'dp-segment-day');
    act(() => day?.props.onFocus());
    act(() => day?.props.onChangeText('31'));
    const month = tree.root
      .findAllByType(TextInput)
      .find((i) => i.props.testID === 'dp-segment-month');
    act(() => month?.props.onChangeText('02'));
    const year = tree.root
      .findAllByType(TextInput)
      .find((i) => i.props.testID === 'dp-segment-year');
    act(() => year?.props.onChangeText('2026'));
    expect(texts(tree)).toContain(strings.errorInvalidDate);
  });

  it('is not typeable when disabled', () => {
    const tree = mount({ allowTyping: true, disabled: true });
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  });
});
