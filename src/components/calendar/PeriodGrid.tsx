import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PickerStyles, StyleKey } from '../theme/styleKeys';
import { MAX_FONT_SCALE } from '../theme/a11y';
import type { ThemeTokens } from '../theme/tokens';
import { buildCalendarStyles } from './calendarStyles';

export interface PeriodItem {
  value: number;
  label: string;
  a11yLabel?: string;
  selected: boolean;
  disabled: boolean;
}

interface Props {
  kind: 'year' | 'month';
  items: PeriodItem[];
  onSelect: (value: number) => void;
  renderCell?: (item: PeriodItem) => React.ReactNode;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  testID?: string;
}

const KEYS: Record<
  'year' | 'month',
  {
    grid: StyleKey;
    cell: StyleKey;
    selected: StyleKey;
    disabled: StyleKey;
    text: StyleKey;
  }
> = {
  year: {
    grid: 'yearGrid',
    cell: 'yearCell',
    selected: 'yearCellSelected',
    disabled: 'yearCellDisabled',
    text: 'yearCellText',
  },
  month: {
    grid: 'monthGrid',
    cell: 'monthCell',
    selected: 'monthCellSelected',
    disabled: 'monthCellDisabled',
    text: 'monthCellText',
  },
};

/** The 3×4 year grid (12 years a page) or month grid. */
const PeriodGrid: React.FC<Props> = ({
  kind,
  items,
  onSelect,
  renderCell,
  tokens,
  styles,
  testID,
}) => {
  const s = buildCalendarStyles(tokens);
  const k = KEYS[kind];
  return (
    <View style={[s.grid, styles?.[k.grid]]}>
      {items.map((item) => (
        <View key={item.value} style={s.gridCell}>
          <Pressable
            testID={testID ? `${testID}-${kind}-${item.value}` : undefined}
            accessibilityRole="button"
            accessibilityLabel={item.a11yLabel ?? item.label}
            accessibilityState={{
              selected: item.selected,
              disabled: item.disabled,
            }}
            disabled={item.disabled}
            onPress={() => onSelect(item.value)}
            style={[
              s.gridButton,
              styles?.[k.cell],
              item.selected && [s.gridSelected, styles?.[k.selected]],
              item.disabled && [s.gridDisabled, styles?.[k.disabled]],
            ]}
          >
            {renderCell ? (
              renderCell(item)
            ) : (
              <Text
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={[
                  s.gridText,
                  styles?.[k.text],
                  item.selected && s.gridSelectedText,
                ]}
              >
                {item.label}
              </Text>
            )}
          </Pressable>
        </View>
      ))}
    </View>
  );
};

export default PeriodGrid;
