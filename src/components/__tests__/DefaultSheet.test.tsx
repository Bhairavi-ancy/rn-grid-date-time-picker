import { describe, expect, it, jest } from '@jest/globals';
import { Modal, StyleSheet, Text, View } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DefaultSheet from '../container/DefaultSheet';
import { buildTokens } from '../theme/tokens';

const mount = (
  onRequestClose: () => void,
  styles?: { sheet?: object }
): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <DefaultSheet
        onRequestClose={onRequestClose}
        body={<Text>the body</Text>}
        footer={<Text>the footer</Text>}
        testID="s"
        tokens={buildTokens()}
        styles={styles}
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
});
