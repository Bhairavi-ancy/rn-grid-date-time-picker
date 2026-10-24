import type { ComponentRef } from 'react';
import type { ScrollView, TextInput, TextInputProps } from 'react-native';

/**
 * React Native types spelled so every supported version has them: 0.88 added
 * `TextInputInstance` / `ScrollViewInstance` and dropped older names, while
 * apps on 0.86 and earlier only have the older ones.
 */
export type TextInputRef = ComponentRef<typeof TextInput>;
export type ScrollViewRef = ComponentRef<typeof ScrollView>;
export type KeyPressEvent = Parameters<
  NonNullable<TextInputProps['onKeyPress']>
>[0];
