import { describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import type { DateTimePickerProps } from '../types';

const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));
const mountAndOpen = (props: Partial<DateTimePickerProps>) => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <DateTimePicker
        type="datetime"
        value=""
        onChange={() => {}}
        now={now}
        testID="dp"
        {...(props as object)}
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

describe('bad props fall back instead of crashing', () => {
  it.each([0, -5, 90, 2.5])('minuteStep %p uses 1, with a warning', (step) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      mountAndOpen({ minuteStep: step, timeInput: 'wheel' })
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('minuteStep'));
    warn.mockRestore();
  });

  it('an unknown timeZone uses the device zone, with a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    mountAndOpen({ timeZone: 'Foo/Bar' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("'Foo/Bar'"));
    // No broken dates (they showed up as duplicate React keys).
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });

  it('a custom parse that throws reads the value as empty, with a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      mountAndOpen({
        value: 'from the API',
        valueFormat: {
          parse: () => {
            throw new Error('bad data');
          },
          format: () => '',
        },
      })
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('valueFormat.parse threw'),
      expect.any(Error)
    );
    warn.mockRestore();
  });
});
