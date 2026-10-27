import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * The picker's built-in icons, drawn with plain Views (no SVG, so nothing
 * native to install). Each one is a component that takes `color`, `width` and
 * `height`, so an app's own icon component (for example an imported SVG) can
 * replace it through the `icons` prop.
 */

export type IconName =
  'calendar' | 'clear' | 'chevronLeft' | 'chevronRight' | 'chevronDown';

/** What every icon is drawn with. `size` is the smaller of `width` and `height`. */
export interface IconRenderProps {
  color: string;
  size: number;
  width: number;
  height: number;
}

/** Per-icon overrides for the `iconProps` prop. Any field left out keeps the built-in value for that spot. */
export interface IconOptions {
  color?: string;
  /** Used while the control holding the icon is disabled. */
  disabledColor?: string;
  /** Sets both width and height. */
  size?: number;
  width?: number;
  height?: number;
}

export type IconComponent = React.ComponentType<IconRenderProps>;

/** A replacement component per icon; null hides that icon. */
export type IconSet = Record<IconName, IconComponent | null>;

const s = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  // RTL swaps left and right borders, which would move a chevron's corner.
  ltr: { direction: 'ltr' },
  bar: { position: 'absolute' },
  frame: { overflow: 'hidden' },
});

const strokeOf = (size: number) => Math.max(1.5, Math.round(size / 12));

/** A square with two borders, rotated so its corner points the right way. */
const Chevron: React.FC<IconRenderProps & { rotate: string }> = ({
  color,
  size,
  width,
  height,
  rotate,
}) => {
  const side = size * 0.4;
  return (
    <View style={[s.box, s.ltr, { width, height }]}>
      <View
        style={{
          width: side,
          height: side,
          borderColor: color,
          borderLeftWidth: strokeOf(size),
          borderBottomWidth: strokeOf(size),
          transform: [{ rotate }],
        }}
      />
    </View>
  );
};

export const ChevronLeftIcon: React.FC<IconRenderProps> = (p) => (
  <Chevron {...p} rotate="45deg" />
);

export const ChevronRightIcon: React.FC<IconRenderProps> = (p) => (
  <Chevron {...p} rotate="-135deg" />
);

export const ChevronDownIcon: React.FC<IconRenderProps> = (p) => (
  <Chevron {...p} rotate="-45deg" />
);

/** A rounded outlined rectangle with a filled top bar. */
export const CalendarIcon: React.FC<IconRenderProps> = ({
  color,
  size,
  width,
  height,
}) => {
  const stroke = strokeOf(size);
  return (
    <View style={[s.box, { width, height }]}>
      <View
        style={[
          s.frame,
          {
            width: width * 0.84,
            height: height * 0.76,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: Math.max(2, size / 8),
          },
        ]}
      >
        <View style={{ height: height * 0.18, backgroundColor: color }} />
      </View>
    </View>
  );
};

/**
 * Two crossed bars with round ends. The cross spans 70% of the box, so it sits
 * inside its bounds like the other icons.
 */
export const ClearIcon: React.FC<IconRenderProps> = ({
  color,
  size,
  width,
  height,
}) => {
  const thickness = Math.max(1.5, size / 8);
  const bar = {
    width: size * 0.7 * Math.SQRT2,
    height: thickness,
    borderRadius: thickness / 2,
    backgroundColor: color,
  };
  return (
    <View style={[s.box, { width, height }]}>
      <View style={[s.bar, bar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[s.bar, bar, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
};

export const DEFAULT_ICONS: IconSet = {
  calendar: CalendarIcon,
  clear: ClearIcon,
  chevronLeft: ChevronLeftIcon,
  chevronRight: ChevronRightIcon,
  chevronDown: ChevronDownIcon,
};

/** The built-in icons with the caller's replacements on top. */
export const resolveIcons = (icons?: Partial<IconSet>): IconSet => {
  return { ...DEFAULT_ICONS, ...icons };
};

/**
 * One icon as drawn at a spot in the picker: that spot's colour and size, with
 * the caller's `iconProps` on top. Nothing when the icon is hidden.
 */
export const renderIcon = (
  Icon: IconComponent | null,
  spot: { color: string; size: number; disabled?: boolean },
  options?: IconOptions
): React.ReactNode => {
  if (!Icon) return null;
  const color =
    (spot.disabled ? options?.disabledColor : options?.color) ?? spot.color;
  const width = options?.width ?? options?.size ?? spot.size;
  const height = options?.height ?? options?.size ?? spot.size;
  return (
    <Icon
      color={color}
      width={width}
      height={height}
      size={Math.min(width, height)}
    />
  );
};
