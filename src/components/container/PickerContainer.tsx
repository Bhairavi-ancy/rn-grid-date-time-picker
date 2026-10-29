import React from 'react';
import { View } from 'react-native';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import type { SheetOptions, SheetRenderProps } from '../types';
import DefaultSheet from './DefaultSheet';
import { buildPickerLayout, type PickerLayoutProps } from './PickerLayout';

export interface PickerContainerProps extends PickerLayoutProps {
  presentation: 'sheet' | 'inline';
  isOpen: boolean;
  onRequestClose: () => void;
  /** Replaces the built-in sheet; called only while open. */
  renderSheet?: (p: SheetRenderProps) => React.ReactNode;
  sheet?: SheetOptions;
}

/**
 * 'sheet': mounted only while open and rendered inside the trigger's tree (no
 * portal, so a picker inside another sheet keeps working). The built-in sheet
 * grows to 90% of the screen; beyond that the picker's own body scrolls between
 * the title and Confirm (the wheel columns scroll nested).
 * Close, backdrop and Android back call onRequestClose only.
 * 'inline': the same content in place, e.g. inside a filter's own sheet.
 */
const PickerContainer: React.FC<PickerContainerProps> = ({
  presentation,
  isOpen,
  onRequestClose,
  renderSheet,
  sheet,
  ...layout
}) => {
  const { body, footer } = buildPickerLayout({
    ...layout,
    scrollBody: presentation === 'sheet',
    fixedHeader: sheet?.fixedHeader,
    fixedFooter: sheet?.fixedFooter,
    fill: !renderSheet && sheet?.height !== undefined,
  });

  if (presentation === 'inline') {
    return (
      <View testID={layout.testID ? `${layout.testID}-inline` : undefined}>
        {body}
        {footer}
      </View>
    );
  }

  if (!isOpen) return null;
  const renderDefaultSheet = (p: SheetRenderProps) => (
    <DefaultSheet
      {...p}
      height={sheet?.height}
      maxHeight={sheet?.maxHeight}
      keyboardMaxHeight={sheet?.keyboardMaxHeight}
      bottomInset={sheet?.bottomInset}
      closeLabel={layout.state.strings.a11yClose ?? DEFAULT_STRINGS.a11yClose}
      tokens={layout.state.tokens}
      styles={layout.styles}
    />
  );
  return (
    <>
      {(renderSheet ?? renderDefaultSheet)({
        onRequestClose,
        body,
        footer,
        testID: layout.testID ? `${layout.testID}-sheet` : undefined,
      })}
    </>
  );
};

export default PickerContainer;
