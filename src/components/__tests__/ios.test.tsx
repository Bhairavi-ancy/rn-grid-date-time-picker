import { describe, expect, it, jest } from '@jest/globals';
import { AccessibilityInfo, TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import FieldMessages from '../field/FieldMessages';
import { buildTokens } from '../theme/tokens';

// The React Native Jest preset runs as iOS.
const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));

describe('iOS keyboard', () => {
  it('every typed box gets its own Done button, labelled from strings.done', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DateTimePicker
          type="datetime"
          value=""
          onChange={() => {}}
          now={now}
          timeZone="UTC"
          allowTyping
          allowFieldTyping
          strings={{ done: 'Fertig' }}
          testID="dp"
        />
      );
    });
    act(() =>
      tree.root
        .findAll(
          (n) =>
            n.props.testID === 'dp-trigger-icon' && typeof n.type !== 'string'
        )[0]!
        .props.onPress()
    );
    const boxes = tree.root.findAllByType(TextInput);
    // On-screen field, the field in the sheet, and the two time boxes.
    expect(boxes.length).toBeGreaterThanOrEqual(12);
    for (const box of boxes) {
      expect(box.props.returnKeyType).toBe('done');
      expect(box.props.inputAccessoryViewButtonLabel).toBe('Fertig');
      expect(box.props.inputAccessoryViewID).toBeUndefined();
    }
  });
});

describe('iOS error announcements', () => {
  it('announces a new error to VoiceOver', () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<FieldMessages tokens={buildTokens()} />);
    });
    expect(announce).not.toHaveBeenCalled();
    act(() =>
      tree.update(
        <FieldMessages tokens={buildTokens()} error="Enter a valid date" />
      )
    );
    expect(announce).toHaveBeenCalledWith('Enter a valid date');
    announce.mockRestore();
  });
});
