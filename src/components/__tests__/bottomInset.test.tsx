import { describe, expect, it, jest } from '@jest/globals';

describe('useBottomInset', () => {
  it('an app without react-native-safe-area-context gets 0, and nothing breaks', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native-safe-area-context', () => {
        throw new Error("Cannot find module 'react-native-safe-area-context'");
      });
      // Everything from this registry, so the hook and the renderer share one React.
      const { createElement } = require('react') as typeof import('react');
      const { Text } = require('react-native') as typeof import('react-native');
      const renderer =
        require('react-test-renderer') as typeof import('react-test-renderer');
      const { useBottomInset } =
        require('../hooks/useBottomInset') as typeof import('../hooks/useBottomInset');
      const Probe = () => createElement(Text, null, useBottomInset());
      let tree!: import('react-test-renderer').ReactTestRenderer;
      renderer.act(() => {
        tree = renderer.create(createElement(Probe));
      });
      expect(tree.root.findByType(Text).props.children).toBe(0);
    });
  });
});
