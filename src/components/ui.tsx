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
import { AppText } from './AppText';

/** A labelled text input with animated focus ring. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  autoFocus,
  multiline,
  helpText,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoFocus?: boolean;
  multiline?: boolean;
  helpText?: string;
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
    <View style={{ marginBottom: theme.spacing(4) }}>
      {label ? (
        <AppText
          variant="caption"
          color={focused ? 'primary' : 'textMuted'}
          weight="600"
          style={{ marginBottom: 6 }}
        >
          {label}
        </AppText>
      ) : null}
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
          placeholderTextColor={theme.colors.textMuted}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoFocus={autoFocus}
          multiline={multiline}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            paddingHorizontal: 14,
            paddingVertical: multiline ? 12 : 14,
            minHeight: multiline ? 88 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
            fontSize: 16,
            color: theme.colors.text,
          }}
        />
      </Animated.View>
      {helpText ? (
        <AppText variant="caption" color="textMuted" style={{ marginTop: 6 }}>
          {helpText}
        </AppText>
      ) : null}
    </View>
  );
}

/** A screen container: themed background + top safe-area padding + optional title. */
export function Screen({
  children,
  title,
  left,
  subtitle,
  onBack,
  right,
  noPadTop,
}: {
  children: React.ReactNode;
  title?: string;
  left?: React.ReactNode;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  noPadTop?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: noPadTop ? 0 : insets.top }}>
      {(title !== undefined || left) ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: theme.spacing(4),
            paddingVertical: theme.spacing(3),
            gap: theme.spacing(2),
          }}
        >
          {onBack ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: theme.colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 22, lineHeight: 24, marginTop: -2 }}>‹</Text>
            </PressableScale>
          ) : null}
          {left ? <View style={{ flex: 1 }}>{left}</View> : (
          <View style={{ flex: 1 }}>
            <AppText variant="h2" numberOfLines={1}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          )}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** The app's button. Brand-filled primary, tinted secondary, or quiet ghost. */
export function Button({
  label,
  onPress,
  busy,
  disabled,
  variant = 'primary',
  leading,
  style,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const theme = useTheme();
  const off = disabled || busy;

  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.colors.primary, fg: theme.colors.onPrimary },
    secondary: { bg: theme.colors.primarySoft, fg: theme.colors.primary },
    ghost: { bg: 'transparent', fg: theme.colors.text, border: theme.colors.border },
    danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger },
  };
  const p = palette[variant];

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={[
        {
          backgroundColor: p.bg,
          borderRadius: theme.radius.pill,
          paddingVertical: 16,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderWidth: p.border ? 1.5 : 0,
          borderColor: p.border,
          opacity: off ? 0.55 : 1,
        },
        variant === 'primary' ? theme.shadow(1) : null,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {leading}
          <AppText variant="button" style={{ color: p.fg }}>
            {label}
          </AppText>
        </>
      )}
    </PressableScale>
  );
}

/** The primary call-to-action. Kept as a thin alias so existing screens are unchanged. */
export function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  return <Button label={label} onPress={onPress} busy={busy} disabled={disabled} style={style} />;
}

/** A circular icon button — a glyph or SVG on a soft surface. */
export function IconButton({
  glyph,
  onPress,
  accessibilityLabel,
  tint,
  badge,
  size = 40,
}: {
  glyph?: string;
  onPress: () => void;
  accessibilityLabel: string;
  tint?: string;
  badge?: React.ReactNode;
  size?: number;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {glyph ? <Text style={{ fontSize: size * 0.46, color: tint ?? theme.colors.text }}>{glyph}</Text> : null}
      {badge ? <View style={{ position: 'absolute', top: -4, right: -4 }}>{badge}</View> : null}
    </PressableScale>
  );
}

/** A surface card. */
export function Card({
  children,
  style,
  elevated,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padded?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing(4) : 0,
        },
        elevated ? theme.shadow(1) : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A hairline divider. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }): React.JSX.Element {
  const theme = useTheme();
  return <View style={[{ height: 1, backgroundColor: theme.colors.border }, style]} />;
}
