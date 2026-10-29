import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { PickerState, Slot } from '../types';
import type { PickerStyles } from '../theme/styleKeys';
import { buildContainerStyles } from './containerStyles';

export interface PickerLayoutProps {
  state: PickerState;
  header?: Slot;
  title?: string;
  onReset?: () => void;
  bodyTop?: Slot;
  bodyBottom?: Slot;
  footer?: Slot;
  confirmLabel: string;
  confirmDisabled: boolean;
  onConfirm: () => void;
  styles?: PickerStyles;
  testID?: string;
  /** The picker's own content (field, calendar, time). */
  children?: React.ReactNode;
  /** Sheet only: the content scrolls between the header and the footer when it doesn't fit. */
  scrollBody?: boolean;
  /** Sheet only: false scrolls the header with the body. Default true. */
  fixedHeader?: boolean;
  /** Sheet only: false scrolls the footer at the end of the body (and returns no footer). Default true. */
  fixedFooter?: boolean;
  /** The sheet has a fixed height: the body fills it. */
  fill?: boolean;
}

const renderSlot = (
  slot: Slot | undefined,
  state: PickerState
): React.ReactNode => (typeof slot === 'function' ? slot(state) : slot);

/**
 * The picker's layout: header, bodyTop, the picker's own content, bodyBottom.
 * The footer is returned separately so a bottom sheet can pin it below the body.
 * Every slot can be replaced; the defaults are a title + Reset header and one
 * Confirm button.
 */
export const buildPickerLayout = ({
  state,
  header,
  title,
  onReset,
  bodyTop,
  bodyBottom,
  footer,
  confirmLabel,
  confirmDisabled,
  onConfirm,
  styles,
  testID,
  children,
  scrollBody,
  fixedHeader = true,
  fixedFooter = true,
  fill,
}: PickerLayoutProps): { body: React.ReactNode; footer: React.ReactNode } => {
  const s = buildContainerStyles(state.tokens);

  const defaultHeader =
    title || onReset ? (
      <View style={[s.header, styles?.header]}>
        <Text accessibilityRole="header" style={[s.title, styles?.title]}>
          {title ?? ''}
        </Text>
        {onReset ? (
          <Pressable
            testID={testID ? `${testID}-reset` : undefined}
            accessibilityRole="button"
            onPress={onReset}
            hitSlop={8}
            style={[s.resetButton, styles?.resetButton]}
          >
            <Text style={[s.resetText, styles?.resetText]}>
              {state.strings.reset}
            </Text>
          </Pressable>
        ) : null}
      </View>
    ) : null;

  const defaultFooter = (
    <View style={[s.footer, styles?.footer]}>
      <Pressable
        testID={testID ? `${testID}-confirm` : undefined}
        accessibilityRole="button"
        accessibilityState={{ disabled: confirmDisabled }}
        disabled={confirmDisabled}
        onPress={onConfirm}
        style={[
          s.confirmButton,
          styles?.confirmButton,
          confirmDisabled && s.confirmButtonDisabled,
        ]}
      >
        <Text style={[s.confirmText, styles?.confirmText]}>{confirmLabel}</Text>
      </Pressable>
    </View>
  );

  const content = (
    <>
      {renderSlot(bodyTop, state)}
      <View style={[s.body, styles?.body]}>{children}</View>
      {renderSlot(bodyBottom, state)}
    </>
  );

  const headerNode =
    header === undefined ? defaultHeader : renderSlot(header, state);
  const footerNode =
    footer === undefined ? defaultFooter : renderSlot(footer, state);
  const headerScrolls = !!scrollBody && !fixedHeader;
  const footerScrolls = !!scrollBody && !fixedFooter;

  const body = (
    <View
      style={[
        s.container,
        scrollBody && s.containerScroll,
        scrollBody && fill && s.containerFill,
        styles?.container,
      ]}
    >
      {headerScrolls ? null : headerNode}
      {scrollBody ? (
        <ScrollView
          testID={testID ? `${testID}-scroll` : undefined}
          style={s.scroll}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {headerScrolls ? headerNode : null}
          {content}
          {footerScrolls ? (
            <View style={s.footerInScroll}>{footerNode}</View>
          ) : null}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );

  return { body, footer: footerScrolls ? null : footerNode };
};
