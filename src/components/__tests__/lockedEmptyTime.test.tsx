import { describe, expect, it } from '@jest/globals';
import { TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import type { DateTimePickerProps } from '../types';

// Wednesday 21 Oct 2026, 06:30 UTC.
const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));

// min after max: no day can ever be picked.
const mount = (props: Partial<DateTimePickerProps>): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <DateTimePicker
        type="datetime"
        value=""
        onChange={() => {}}
        now={now}
        timeZone="UTC"
        timeFormat="12h"
        minDate={{ year: 2026, month: 6, day: 22 }}
        maxDate={{ year: 2026, month: 6, day: 12 }}
        testID="dp"
        {...props}
      />
    );
  });
  act(() =>
    tree.root
      .findAll(
        (n) =>
          n.props.testID === 'dp-trigger-field' && typeof n.type !== 'string'
      )[0]
      ?.props.onPress()
  );
  return tree;
};
const box = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAllByType(TextInput).find((i) => i.props.testID === id);
const period = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAll(
    (n) => n.props.testID === id && n.props.accessibilityRole === 'radio'
  )[0];

describe("emptyState 'locked': time rows", () => {
  it('locks the time boxes and AM/PM with the calendar', () => {
    const tree = mount({ emptyState: 'locked' });
    expect(box(tree, 'dp-time-hour')?.props.editable).toBe(false);
    expect(box(tree, 'dp-time-minute')?.props.editable).toBe(false);
    expect(period(tree, 'dp-time-am')?.props.disabled).toBe(true);
    expect(period(tree, 'dp-time-pm')?.props.disabled).toBe(true);
  });

  it('leaves the time rows alone with the default empty state', () => {
    const tree = mount({});
    expect(box(tree, 'dp-time-hour')?.props.editable).toBe(true);
  });
});
