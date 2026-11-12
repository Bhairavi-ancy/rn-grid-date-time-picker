import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { Platform, TextInput, View } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';

const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));
const setOS = (os: string) =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

const mount = (): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <DateTimePicker
        type="datetime"
        presentation="inline"
        value="2026-10-25T09:30:00.000Z"
        onChange={() => {}}
        now={now}
        timeZone="UTC"
        timeFormat="12h"
        testID="dp"
      />
    );
  });
  return tree;
};
/** The View right around a time box's TextInput. */
const inner = (tree: ReactTestRenderer, key: 'hour' | 'minute') =>
  tree.root
    .findAllByType(View)
    .find(
      (v) =>
        v
          .findAllByType(TextInput)
          .some((i) => i.props.testID === `dp-time-${key}`) &&
        v.props.pointerEvents !== undefined
    )!;
const wrap = (tree: ReactTestRenderer, key: 'hour' | 'minute') =>
  tree.root.findAll(
    (n) =>
      n.props.testID === `dp-time-${key}-wrap` && typeof n.type !== 'string'
  )[0]!;

describe('Android time boxes inside a scrolling sheet', () => {
  const os = Platform.OS;
  beforeEach(() => {
    setOS('android');
  });
  afterEach(() => {
    setOS(os);
  });

  it('the boxes let a drag through to the sheet; a tap on one focuses it', () => {
    const tree = mount();
    expect(inner(tree, 'hour').props.pointerEvents).toBe('none');
    expect(wrap(tree, 'hour').props.disabled).toBe(false);
    expect(wrap(tree, 'hour').props.focusable).toBe(false);
    const input = tree.root
      .findAllByType(TextInput)
      .find((i) => i.props.testID === 'dp-time-hour')!;
    act(() => wrap(tree, 'hour').props.onPress());
    act(() => input.props.onFocus());
    // Nothing flips with focus: a flip made Android move focus box to box.
    expect(inner(tree, 'hour').props.pointerEvents).toBe('none');
    expect(wrap(tree, 'hour').props.disabled).toBe(false);
    expect(inner(tree, 'minute').props.pointerEvents).toBe('none');
    expect(wrap(tree, 'minute').props.disabled).toBe(false);
  });

  it('a tap on the box being edited focuses it again (the keyboard comes back)', () => {
    const tree = mount();
    const input = tree.root
      .findAllByType(TextInput)
      .find((i) => i.props.testID === 'dp-time-hour')!;
    act(() => input.props.onFocus());
    expect(wrap(tree, 'hour').props.disabled).toBe(false);
    expect(typeof wrap(tree, 'hour').props.onPress).toBe('function');
  });

  it('iOS keeps the boxes as they were', () => {
    setOS('ios');
    const tree = mount();
    expect(inner(tree, 'hour').props.pointerEvents).toBe('auto');
    expect(wrap(tree, 'hour').props.disabled).toBe(true);
  });
});
