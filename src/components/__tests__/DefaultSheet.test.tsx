import { describe, expect, it, jest } from '@jest/globals';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DefaultSheet from '../container/DefaultSheet';
import { buildTokens } from '../theme/tokens';

const mount = (
  onRequestClose: () => void,
  styles?: { sheet?: object },
  sizes?: { maxHeight?: '90%'; keyboardMaxHeight?: '50%' | 300 }
): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <DefaultSheet
        onRequestClose={onRequestClose}
        body={<Text>the body</Text>}
        footer={<Text>the footer</Text>}
        testID="s"
        closeLabel="Close"
        tokens={buildTokens()}
        styles={styles}
        {...sizes}
      />
    );
  });
  return tree;
};
const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map((t) => t.props.children);
const panel = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(View).find((n) => n.props.testID === 's');

describe('DefaultSheet', () => {
  it('renders the body above the footer in the panel', () => {
    const tree = mount(() => {});
    expect(texts(tree)).toEqual(['the body', 'the footer']);
    expect(panel(tree)).toBeTruthy();
  });

  it('passes the testID through, and styles.sheet styles the panel', () => {
    const tree = mount(() => {}, { sheet: { paddingBottom: 40 } });
    const style = StyleSheet.flatten(panel(tree)?.props.style);
    expect(style.paddingBottom).toBe(40);
    expect(typeof style.maxHeight).toBe('number');
  });

  it('the backdrop and Android back call onRequestClose', () => {
    const onRequestClose = jest.fn();
    const tree = mount(onRequestClose);
    const backdrop = tree.root.findAll(
      (n) => n.props.testID === 's-backdrop' && typeof n.type !== 'string'
    )[0];
    expect(backdrop?.props.accessibilityLabel).toBe('Close');
    act(() => backdrop?.props.onPress());
    expect(onRequestClose).toHaveBeenCalledTimes(1);
    act(() => tree.root.findByType(Modal).props.onRequestClose());
    expect(onRequestClose).toHaveBeenCalledTimes(2);
  });

  it('while the keyboard is up, keyboardMaxHeight is of the room above it', () => {
    const listeners: Record<string, (e?: object) => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      name: string,
      cb: (e?: object) => void
    ) => {
      listeners[name] = cb;
      return { remove: () => {} };
    }) as never);
    const maxHeight = (tree: ReactTestRenderer) =>
      StyleSheet.flatten(panel(tree)?.props.style).maxHeight;
    const keyboard = (tree: ReactTestRenderer, room: number) => {
      // The view the panel sits in (the innermost one that measures itself):
      // the room above the keyboard.
      const area = tree.root
        .findAll(
          (n) =>
            n.type === View &&
            n.props.onLayout &&
            n.findAll((c) => c.props.testID === 's').length > 0
        )
        .at(-1)!;
      act(() =>
        area.props.onLayout({ nativeEvent: { layout: { height: room } } })
      );
      const show = Object.keys(listeners).find((k) => k.endsWith('Show'));
      act(() => listeners[show!]());
    };

    const byDefault = mount(() => {});
    keyboard(byDefault, 400);
    expect(maxHeight(byDefault)).toBe(360); // maxHeight's 90% of the room

    const half = mount(() => {}, undefined, { keyboardMaxHeight: '50%' });
    keyboard(half, 400);
    expect(maxHeight(half)).toBe(200);

    const points = mount(() => {}, undefined, { keyboardMaxHeight: 300 });
    keyboard(points, 250);
    expect(maxHeight(points)).toBe(250); // never taller than the room

    // A window the keyboard doesn't resize: the room is the screen less the keyboard.
    const unresized = mount(() => {}, undefined, { keyboardMaxHeight: '50%' });
    const show = Object.keys(listeners).find((k) => k.endsWith('Show'));
    act(() => listeners[show!]({ endCoordinates: { height: 300 } }));
    expect(maxHeight(unresized)).toBe(
      (Dimensions.get('window').height - 300) / 2
    );

    // A keyboard reported as tall as the window (split screen): the sheet
    // keeps a strip of room instead of collapsing.
    const squeezed = mount(() => {});
    act(() =>
      listeners[show!]({
        endCoordinates: { height: Dimensions.get('window').height + 100 },
      })
    );
    expect(maxHeight(squeezed)).toBe(144); // 90% of the 160 pt floor
    jest.restoreAllMocks();
  });

  it('a keyboard read as up at mount is put right when it finishes hiding', () => {
    const listeners: Record<string, (e?: object) => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      name: string,
      cb: (e?: object) => void
    ) => {
      listeners[name] = cb;
      return { remove: () => {} };
    }) as never);
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    jest
      .spyOn(Keyboard, 'metrics')
      .mockReturnValue({ height: 300, screenX: 0, screenY: 0, width: 0 });
    const tree = mount(() => {});
    const maxHeight = () =>
      StyleSheet.flatten(panel(tree)?.props.style).maxHeight;
    expect(maxHeight()).toBeLessThan(Dimensions.get('window').height * 0.9);
    // Only the did-hide event: on iOS the will-hide one came before the mount.
    act(() => listeners.keyboardDidHide!());
    expect(maxHeight()).toBeCloseTo(Dimensions.get('window').height * 0.9);
    jest.restoreAllMocks();
  });

  it('a sheet opened with the keyboard already up is sized for it', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    jest
      .spyOn(Keyboard, 'metrics')
      .mockReturnValue({ height: 300, screenX: 0, screenY: 0, width: 0 });
    const tree = mount(() => {}, undefined, { keyboardMaxHeight: '50%' });
    expect(StyleSheet.flatten(panel(tree)?.props.style).maxHeight).toBe(
      (Dimensions.get('window').height - 300) / 2
    );
    jest.restoreAllMocks();
  });
});

describe('DefaultSheet: the bottom inset and the keyboard', () => {
  const insets = { top: 0, left: 0, right: 0, bottom: 48 };
  const sheet = (
    props: { bottomInset?: number; styles?: { sheet?: object } } = {},
    withProvider = true
  ) => {
    const el = (
      <DefaultSheet
        onRequestClose={() => {}}
        body={<Text>the body</Text>}
        footer={<Text>the footer</Text>}
        testID="s"
        closeLabel="Close"
        tokens={buildTokens()}
        {...props}
      />
    );
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        withProvider ? (
          <SafeAreaInsetsContext.Provider value={insets}>
            {el}
          </SafeAreaInsetsContext.Provider>
        ) : (
          el
        )
      );
    });
    return tree;
  };
  const paddingBottom = (tree: ReactTestRenderer) =>
    StyleSheet.flatten(panel(tree)?.props.style).paddingBottom;

  it("keeps the app's safe-area inset free below the footer", () => {
    expect(paddingBottom(sheet())).toBe(8 + 48);
  });

  it('without a SafeAreaProvider, nothing is added', () => {
    expect(paddingBottom(sheet({}, false))).toBe(8);
  });

  it('sheet.bottomInset wins over the provider, and styles.sheet over both', () => {
    expect(paddingBottom(sheet({ bottomInset: 20 }))).toBe(8 + 20);
    expect(paddingBottom(sheet({ bottomInset: 0 }))).toBe(8);
    expect(
      paddingBottom(sheet({ styles: { sheet: { paddingBottom: 30 } } }))
    ).toBe(30);
  });

  it('while the keyboard is up the sheet sits on it, with no inset under it', () => {
    const listeners: Record<string, (e?: object) => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      name: string,
      cb: (e?: object) => void
    ) => {
      listeners[name] = cb;
      return { remove: () => {} };
    }) as never);
    const tree = sheet();
    const show = Object.keys(listeners).find((k) => k.endsWith('Show'));
    act(() => listeners[show!]({ endCoordinates: { height: 300 } }));
    expect(paddingBottom(tree)).toBe(8);
    jest.restoreAllMocks();
  });

  it('is moved up by the keyboard on Android too, not only on iOS', () => {
    // KeyboardAvoidingView pads by the part of the screen the keyboard
    // covers: all of it in an edge-to-edge app, whose window doesn't shrink.
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    try {
      const avoiding = sheet().root.findByType(KeyboardAvoidingView);
      expect(avoiding.props.behavior).toBe('padding');
    } finally {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    }
  });
});
