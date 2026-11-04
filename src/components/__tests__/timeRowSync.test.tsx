import { describe, expect, it, jest } from '@jest/globals';
import { useState } from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import type { PickerValue } from '../../core/types';

// Every error any render shows, even one replaced before the next frame.
const rendered: string[] = [];
jest.mock('../field/FieldMessages', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ error }: { error?: string }) => {
      if (!error) return null;
      rendered.push(error);
      return <Text>{error}</Text>;
    },
  };
});

function Screen() {
  const [value, setValue] = useState<PickerValue>('');
  return (
    <DateTimePicker
      type="datetime"
      mode="range"
      commitMode="instant"
      presentation="inline"
      footer={null}
      timeZone="Asia/Kolkata"
      valueFormat="utc-midnight"
      dateFormat="dd-MM-yyyy"
      timeFormat="12h"
      now={() => new Date(Date.UTC(2026, 10, 4, 6, 30))}
      testID="dp"
      value={value}
      onChange={setValue}
    />
  );
}

const day = (tree: ReactTestRenderer, d: number) =>
  act(() =>
    tree.root
      .findAll(
        (n) =>
          n.props.testID === `dp-day-2026-11-${d}` &&
          n.props.accessibilityRole === 'button' &&
          typeof n.type !== 'string'
      )[0]!
      .props.onPress()
  );

describe('time row, instant commit', () => {
  it('a tapped day never flashes "Enter a complete time"', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Screen />);
    });
    day(tree, 19);
    day(tree, 25);
    expect(rendered).toEqual([]);
  });
});
