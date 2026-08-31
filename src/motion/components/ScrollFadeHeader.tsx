import React from 'react';
import { Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/theme';
import { PressableScale } from './PressableScale';

export interface ScrollFadeHeaderProps {
  title: string;
  subtitle?: string;
  scrollY: Animated.SharedValue<number>;
  onBack?: () => void;
  right?: React.ReactNode;
  collapseHeight?: number;
}

export function ScrollFadeHeader({
  title,
  subtitle,
  scrollY,
  onBack,
  right,
  collapseHeight = 100,
}: ScrollFadeHeaderProps): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const headerStyle = useAnimatedStyle(() => ({
    backgroundColor: theme.colors.background,
    borderBottomWidth: interpolate(scrollY.value, [0, collapseHeight], [0, 1], Extrapolation.CLAMP),
    borderBottomColor: theme.colors.border,
    shadowOpacity: interpolate(scrollY.value, [0, collapseHeight], [0, 0.06], Extrapolation.CLAMP),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(scrollY.value, [0, collapseHeight], [28, 20], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [0, collapseHeight * 0.6], [1, 1], Extrapolation.CLAMP),
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, collapseHeight * 0.4], [1, 0], Extrapolation.CLAMP),
    maxHeight: interpolate(scrollY.value, [0, collapseHeight * 0.4], [20, 0], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      style={[
        {
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: 12,
          shadowColor: '#000',
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          zIndex: 10,
        },
        headerStyle,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
        <View style={{ flex: 1 }}>
          <Animated.Text
            style={[
              {
                color: theme.colors.text,
                fontWeight: '900',
                letterSpacing: -0.5,
              },
              titleStyle,
            ]}
          >
            {title}
          </Animated.Text>
          {subtitle ? (
            <Animated.Text
              style={[
                {
                  color: theme.colors.textMuted,
                  fontSize: 14,
                  marginTop: 2,
                },
                subtitleStyle,
              ]}
            >
              {subtitle}
            </Animated.Text>
          ) : null}
        </View>
        {right}
      </View>
    </Animated.View>
  );
}
