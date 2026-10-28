import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ParsedSegments } from '../../core/segments';
import type { DateTimeValue, PickerType, TimeFormat } from '../../core/types';
import type { IconName, IconOptions, IconSet } from '../../icons';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import type { ThemeTokens } from '../theme/tokens';
import type { LabelRenderProps } from '../types';
import FieldMessages from './FieldMessages';
import { formatRangeText, type DateTextFormatter } from './fieldText';
import ValueField from './ValueField';

export type RangeEnd = 'from' | 'to';

interface Props {
  /** 'singleField': one field 'start – end'. 'fromTo': two fields; the active one takes calendar taps. */
  layout: 'singleField' | 'fromTo';
  from: DateTimeValue | null;
  to: DateTimeValue | null;
  activeEnd: RangeEnd;
  onActivate: (end: RangeEnd) => void;
  /** From/To only: each field can be typed in. */
  allowTyping?: boolean;
  onTyped: (end: RangeEnd, parsed: ParsedSegments) => void;
  /** A typed box of one end gained or lost focus. */
  onFocusChange?: (end: RangeEnd, focused: boolean) => void;
  allowClear?: boolean;
  onClear: () => void;
  errorMessage?: string;
  type: PickerType;
  dateFormat: string;
  /** Writes the shown dates another way (as Hijri dates). Not used while typing. */
  dateText?: DateTextFormatter;
  timeFormat: TimeFormat;
  yearRange?: { first: number; last: number };
  disabled?: boolean;
  /** Replaces the built-in From / To labels. */
  renderLabel?: (p: LabelRenderProps) => React.ReactNode;
  /** Placeholder of the one-field layout. */
  placeholder?: string;
  /** The calendar icon at the end of each field. Default false. */
  showIcon?: boolean;
  /** Replacements for the built-in clear icon. */
  icons?: Partial<IconSet>;
  iconProps?: Partial<Record<IconName, IconOptions>>;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  testID?: string;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row' },
  half: { flex: 1 },
  gap: { width: 12 },
});

/** The range fields inside the picker: one 'start – end' field, or From and To side by side. */
const RangeFields: React.FC<Props> = (props) => {
  const {
    layout,
    from,
    to,
    activeEnd,
    onActivate,
    allowTyping,
    onTyped,
    onFocusChange,
    allowClear,
    onClear,
    errorMessage,
    type,
    dateFormat,
    dateText,
    timeFormat,
    yearRange,
    disabled,
    renderLabel,
    placeholder,
    showIcon,
    icons,
    iconProps,
    tokens,
    styles,
    strings,
    testID,
  } = props;
  const common = {
    type,
    dateFormat,
    dateText,
    timeFormat,
    yearRange,
    renderLabel,
    icons,
    iconProps,
    tokens,
    styles,
    strings,
    disabled,
  };

  if (layout === 'singleField') {
    return (
      <ValueField
        {...common}
        value={null}
        displayText={formatRangeText(
          from,
          to,
          type,
          dateFormat,
          timeFormat,
          strings.rangeSeparator,
          dateText
        )}
        placeholder={placeholder}
        allowClear={allowClear}
        onClear={onClear}
        errorMessage={errorMessage}
        icon={showIcon ? undefined : null}
        active
        testID={testID ? `${testID}-value` : undefined}
      />
    );
  }

  const field = (end: RangeEnd) => (
    <View
      style={s.half}
      onTouchStart={() => onActivate(end)}
      testID={testID ? `${testID}-${end}-wrap` : undefined}
    >
      <ValueField
        {...common}
        label={end === 'from' ? strings.from : strings.to}
        value={end === 'from' ? from : to}
        placeholder={placeholder}
        allowTyping={allowTyping}
        onTyped={(parsed) => onTyped(end, parsed)}
        onFocusChange={(focused) => onFocusChange?.(end, focused)}
        onPress={() => onActivate(end)}
        icon={showIcon ? undefined : null}
        active={activeEnd === end}
        testID={testID ? `${testID}-${end}` : undefined}
      />
    </View>
  );

  return (
    <View>
      <View style={s.row}>
        {field('from')}
        <View style={s.gap} />
        {field('to')}
      </View>
      <FieldMessages
        error={errorMessage}
        tokens={tokens}
        styles={styles}
        testID={testID ? `${testID}-range` : undefined}
      />
    </View>
  );
};

export default RangeFields;
