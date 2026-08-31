import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  StyleProp,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, useMotion } from '../motion';
import { useTheme } from '../theme/theme';

/** A labelled text input with animated focus ring. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  autoFocus,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const { spring } = useMotion();
  const [focused, setFocused] = useState(false);
  const borderProgress = useSharedValue(0);

  const handleFocus = () => {
    setFocused(true);
    borderProgress.value = withSpring(1, spring('standard'));
  };

  const handleBlur = () => {
    setFocused(false);
    borderProgress.value = withSpring(0, spring('standard'));
  };

  const borderStyle = useAnimatedStyle(() => {
    const r = borderProgress.value;
    return {
      borderColor: r > 0.5
        ? theme.colors.primary
        : theme.colors.border,
      shadowOpacity: r * 0.15,
      shadowRadius: r * 12,
      transform: [{ scale: 1 + r * 0.005 }],
    };
  });

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          color: focused ? theme.colors.primary : theme.colors.textMuted,
          fontSize: 13,
          marginBottom: 6,
          fontWeight: '700',
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
      <Animated.View
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderWidth: 1.5,
            borderRadius: theme.radius.md,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 2 },
            elevation: focused ? 2 : 0,
          },
          borderStyle,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted + '80'}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoFocus={autoFocus}
          secureTextEntry={secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
            color: theme.colors.text,
            fontWeight: '500',
          }}
        />
      </Animated.View>
    </View>
  );
}

/** A screen container: themed background + top safe-area padding + animated title. */
export function Screen({
  children,
  title,
  onBack,
  right,
  noPadTop,
}: {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  noPadTop?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: noPadTop ? 0 : insets.top }}>
      {title !== undefined ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 8,
          }}
        >
          {onBack ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '600' }}>‹</Text>
            </PressableScale>
          ) : null}
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800', flex: 1, letterSpacing: -0.3 }}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** The primary call-to-action. Brand-filled, with animated press depth. */
export function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
  style,
  variant,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'secondary' | 'outline';
}): React.JSX.Element {
  const theme = useTheme();
  const off = disabled || busy;
  const v = variant ?? 'primary';

  const bg =
    v === 'outline'
      ? 'transparent'
      : v === 'secondary'
        ? theme.colors.surfaceAlt
        : theme.colors.primary;

  const fg =
    v === 'outline'
      ? theme.colors.primary
      : v === 'secondary'
        ? theme.colors.text
        : theme.colors.onPrimary;

  const borderWidth = v === 'outline' ? 1.5 : 0;
  const borderColor = v === 'outline' ? theme.colors.primary : 'transparent';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={[
        {
          backgroundColor: bg,
          borderRadius: theme.radius.pill,
          paddingVertical: 16,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: off ? 0.5 : 1,
          borderWidth,
          borderColor,
          shadowColor: v === 'primary' ? theme.colors.primary : '#000',
          shadowOpacity: v === 'primary' && !off ? 0.2 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: v === 'primary' && !off ? 4 : 0,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontWeight: '800', fontSize: 16, letterSpacing: 0.2 }}>{label}</Text>
      )}
    </PressableScale>
  );
}

/** A surface card with subtle shadow and smooth appearance. */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 16,
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A thin horizontal rule. */
export function Divider({ spacing = 12 }: { spacing?: number }): React.JSX.Element {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: spacing }} />;
}

/** A labelled info row: "Label" on the left, "Value" on the right. */
export function InfoRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ color: bold ? theme.colors.text : theme.colors.textMuted, fontWeight: bold ? '800' : '400', fontSize: bold ? 16 : 14 }}>
        {label}
      </Text>
      <Text style={{ color: theme.colors.text, fontWeight: bold ? '800' : '600', fontSize: bold ? 16 : 14 }}>
        {value}
      </Text>
    </View>
  );
}

/** A small icon button (e.g. for header actions). */
export function IconButton({
  icon,
  label,
  onPress,
  color,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 18, color: color ?? theme.colors.text }}>{icon}</Text>
    </PressableScale>
  );
}
