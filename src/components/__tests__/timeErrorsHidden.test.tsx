import { describe, expect, it } from '@jest/globals';
import { StyleSheet } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import { buildTokens } from '../theme/tokens';
import TimeRow from '../time/TimeRow';

const tokens = buildTokens();

// 09:03 with a 5-minute step is off the step: an error once Confirm was pressed.
const mount = (showError: boolean): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <TimeRow
        time={{ hour: 9, minute: 3 }}
        onTime={() => {}}
        timeFormat="12h"
        minuteStep={5}
        label="Time"
        issueCheck={1}
        showError={showError}
        tokens={tokens}
        strings={DEFAULT_STRINGS}
        testID="t"
      />
    );
  });
  return tree;
};

// Whether any view in that box draws the error border.
const isRed = (tree: ReactTestRenderer, key: 'hour' | 'minute') =>
  tree.root
    .find((n) => n.props.testID === `t-${key}-wrap`)
    .findAll((n) => typeof n.type === 'string' && n.props.style != null)
    .some(
      (n) => StyleSheet.flatten(n.props.style)?.borderColor === tokens.error
    );

describe('time row errors', () => {
  it('shows the red border by default', () => {
    const tree = mount(true);
    expect(isRed(tree, 'hour')).toBe(true);
    expect(isRed(tree, 'minute')).toBe(true);
  });

  it('showError false hides the red border too', () => {
    const tree = mount(false);
    expect(isRed(tree, 'hour')).toBe(false);
    expect(isRed(tree, 'minute')).toBe(false);
  });
});
