import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/theme';
import { FadeIn } from './FadeIn';
import { PressableScale } from './PressableScale';

export interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  large?: boolean;
}

/**
 * A branded screen header with a soft radial gradient accent — used on
 * the home screen and auth screens to anchor the brand presence.
 */
export function GradientHeader({
  title,
  subtitle,
  onBack,
  right,
  large,
}: GradientHeaderProps): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: large ? 28 : 16,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Soft gradient accent orb (pure View, no external dep) */}
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: theme.colors.primary,
          opacity: 0.06,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 20,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: theme.colors.secondary,
          opacity: 0.04,
        }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: large ? 16 : 0 }}>
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
              marginRight: 12,
            }}
          >
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '600' }}>‹</Text>
          </PressableScale>
        ) : null}
        {!large ? (
          <Text style={{ flex: 1, color: theme.colors.text, fontSize: 22, fontWeight: '800' }}>
            {title}
          </Text>
        ) : null}
        {right}
      </View>

      {large ? (
        <FadeIn translateY={8}>
          <Text style={{ color: theme.colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: 15, marginTop: 4, lineHeight: 22 }}>
              {subtitle}
            </Text>
          ) : null}
        </FadeIn>
      ) : null}
    </View>
  );
}
