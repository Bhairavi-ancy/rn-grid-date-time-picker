import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Platform, View } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import type { ScrollViewRef } from '../nativeTypes';
import type { DateTimePickerProps, SheetRenderProps } from '../types';

// An app's own sheet: it renders the picker's body (and its ScrollView) as is.
const renderSheet = (p: SheetRenderProps) => (
  <View testID={`${p.testID}-view`}>
    {p.body}
    {p.footer}
  </View>
);

// Wednesday 21 Oct 2026, 12:00 in India.
const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));
const base: DateTimePickerProps = {
  type: 'datetime',
  value: '',
  onChange: () => {},
  timeZone: 'Asia/Kolkata',
  locale: 'en-IN',
  now,
  renderSheet,
  testID: 'dp',
};

const mount = (props: Partial<DateTimePickerProps> = {}) => {
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
const open = (tree: ReactTestRenderer) =>
  act(() => find(tree, 'dp-trigger-field')!.props.onPress());
/** Taps a day in October 2026; the scroll waits for the next frame. */
const tapOnly = (tree: ReactTestRenderer, d: number) =>
  act(() =>
    tree.root
      .findAll(
        (n) =>
          n.props.testID === `dp-day-2026-10-${d}` &&
          n.props.accessibilityRole === 'button' &&
          typeof n.type !== 'string'
      )[0]!
      .props.onPress()
  );
const nextFrame = () => act(() => jest.advanceTimersByTime(16));
const tap = (tree: ReactTestRenderer, d: number) => {
  tapOnly(tree, d);
  nextFrame();
};

type Measure = (
  cb: (x: number, y: number, w: number, h: number) => void
) => void;
type Instance = {
  measureInWindow: Measure;
  measureLayout: (
    rel: unknown,
    ok: (x: number, y: number, w: number, h: number) => void,
    fail: () => void
  ) => void;
  getInnerViewRef: () => unknown;
  scrollTo: jest.Mock;
  scrollToEnd: jest.Mock;
};

/**
 * Lays out the open sheet: the body shows `view` points from y 100 in the
 * window, scrolled by `offset`; the time section sits at `y` in the scrolled
 * content and is `height` tall. `outer` stands in for an app's ScrollView
 * around an inline picker.
 */
const layout = (
  tree: ReactTestRenderer,
  { y, height, offset = 0, view = 400 }: Record<string, number>,
  outer?: Partial<Instance>
) => {
  const scroll = (outer ?? find(tree, 'dp-scroll')!.instance) as Instance;
  const section = find(tree, 'dp-time-section')!.instance as Instance;
  const content = { content: true };
  scroll.measureInWindow = (cb) => cb(0, 100, 375, view!);
  scroll.getInnerViewRef = () => content;
  scroll.scrollTo = jest.fn();
  scroll.scrollToEnd = jest.fn();
  section.measureInWindow = (cb) => cb(0, 100 + y! - offset, 375, height!);
  section.measureLayout = (rel, ok, fail) =>
    rel === content ? ok(0, y!, 375, height!) : fail();
  return scroll;
};

const setOS = (os: string) =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

describe.each(['ios', 'android'])('sheet.scrollToTime on %s', (os) => {
  const original = Platform.OS;
  beforeEach(() => {
    setOS(os);
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    setOS(original);
  });

  it('single: a picked day scrolls just far enough to show the time', () => {
    const tree = mount();
    open(tree);
    const scroll = layout(tree, { y: 520, height: 90 });
    tap(tree, 23);
    // 520 + 90 − 400
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
    expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 210, animated: true });
  });

  it("measures a frame after the tap, once the tap's layout is on screen", () => {
    const tree = mount();
    open(tree);
    // Before the tap's layout lands, the section reads 0 tall.
    let scroll = layout(tree, { y: 520, height: 0 });
    tapOnly(tree, 23);
    expect(scroll.scrollTo).not.toHaveBeenCalled();
    scroll = layout(tree, { y: 520, height: 90 });
    nextFrame();
    expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 210, animated: true });
  });

  it('nothing scrolls when the sheet closes before the frame', () => {
    const tree = mount();
    open(tree);
    const scroll = layout(tree, { y: 520, height: 90 });
    tapOnly(tree, 23);
    act(() => find(tree, 'dp-confirm')!.props.onPress());
    expect(find(tree, 'dp-scroll')).toBeUndefined();
    nextFrame();
    expect(scroll.scrollTo).not.toHaveBeenCalled();
  });

  it('does nothing while the time already shows in full', () => {
    const tree = mount();
    open(tree);
    const scroll = layout(tree, { y: 520, height: 90, offset: 250 });
    tap(tree, 23);
    expect(scroll.scrollTo).not.toHaveBeenCalled();
    expect(scroll.scrollToEnd).not.toHaveBeenCalled();
  });

  it('shows the top of a time section taller than the body', () => {
    const tree = mount();
    open(tree);
    const scroll = layout(tree, { y: 520, height: 450 });
    tap(tree, 23);
    expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 520, animated: true });
  });

  it("range: only once the end is picked; a new start doesn't scroll", () => {
    const tree = mount({ mode: 'range' });
    open(tree);
    const scroll = layout(tree, { y: 520, height: 180 });
    tap(tree, 23);
    expect(scroll.scrollTo).not.toHaveBeenCalled();
    tap(tree, 27);
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
    expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 300, animated: true });
    tap(tree, 24);
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('range From / To: the end tap scrolls, the start tap does not', () => {
    const tree = mount({ mode: 'range', range: { layout: 'fromTo' } });
    open(tree);
    const scroll = layout(tree, { y: 520, height: 90 });
    tap(tree, 23);
    expect(scroll.scrollTo).not.toHaveBeenCalled();
    tap(tree, 27);
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('multiple: the first date scrolls, the next ones leave the calendar in view', () => {
    const tree = mount({ mode: 'multiple' });
    open(tree);
    const scroll = layout(tree, { y: 520, height: 90 });
    tap(tree, 23);
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
    tap(tree, 25);
    tap(tree, 27);
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('multiple per date: the first date scrolls once its row shows', () => {
    const tree = mount({ mode: 'multiple', multiple: { timeMode: 'perDate' } });
    open(tree);
    const scroll = layout(tree, { y: 520, height: 90 });
    tap(tree, 23);
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
    tap(tree, 25);
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
  });

  it("'end' scrolls to the end of the body", () => {
    const tree = mount({ sheet: { scrollToTime: 'end' } });
    open(tree);
    const scroll = layout(tree, { y: 520, height: 90 });
    tap(tree, 23);
    expect(scroll.scrollToEnd).toHaveBeenCalledWith({ animated: true });
    expect(scroll.scrollTo).not.toHaveBeenCalled();
  });

  it('false turns it off', () => {
    const tree = mount({ sheet: { scrollToTime: false } });
    open(tree);
    const scroll = layout(tree, { y: 520, height: 90 });
    tap(tree, 23);
    expect(scroll.scrollTo).not.toHaveBeenCalled();
    expect(scroll.scrollToEnd).not.toHaveBeenCalled();
  });

  it('a date picker has no time section to scroll to', () => {
    const tree = mount({ type: 'date' });
    open(tree);
    expect(find(tree, 'dp-time-section')).toBeUndefined();
    tap(tree, 23);
  });

  it('inline without scrollToTimeRef: nothing scrolls (no body ScrollView)', () => {
    const tree = mount({ presentation: 'inline' });
    expect(find(tree, 'dp-scroll')).toBeUndefined();
    tap(tree, 23);
  });

  // The app's ScrollView around an inline picker.
  const inline = (props: Partial<DateTimePickerProps> = {}) => {
    const outer: Partial<Instance> = {};
    const tree = mount({
      presentation: 'inline',
      scrollToTimeRef: { current: outer as unknown as ScrollViewRef },
      ...props,
    });
    return { tree, outer };
  };

  it('inline with scrollToTimeRef: a picked day scrolls that ScrollView', () => {
    const { tree, outer } = inline();
    const scroll = layout(tree, { y: 520, height: 90 }, outer);
    tap(tree, 23);
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
    expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 210, animated: true });
  });

  it('inline range From / To: only the end tap scrolls', () => {
    const { tree, outer } = inline({
      mode: 'range',
      range: { layout: 'fromTo' },
    });
    const scroll = layout(tree, { y: 520, height: 180 }, outer);
    tap(tree, 23);
    expect(scroll.scrollTo).not.toHaveBeenCalled();
    tap(tree, 27);
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
  });

  it("inline: sheet.scrollToTime doesn't apply, the ref turns it on", () => {
    const { tree, outer } = inline({ sheet: { scrollToTime: false } });
    const scroll = layout(tree, { y: 520, height: 90 }, outer);
    tap(tree, 23);
    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('inline date picker: no time section, nothing scrolls', () => {
    const { tree, outer } = inline({ type: 'date' });
    expect(find(tree, 'dp-time-section')).toBeUndefined();
    outer.scrollTo = jest.fn();
    tap(tree, 23);
    expect(outer.scrollTo).not.toHaveBeenCalled();
  });
});
