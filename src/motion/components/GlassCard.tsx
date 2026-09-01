import React from 'react';
import { StyleProp, ViewStyle, Platform } from 'react-native';
import { MotiView } from 'moti';

import { useTheme } from '../../theme/theme';
import { useReducedMotion } from '../useReducedMotion';

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  intensity?: 'light' | 'medium' | 'heavy';
}

export function GlassCard({
  children,
  style,
  delay = 0,
  intensity = 'medium',
}: GlassCardProps): React.JSX.Element {
  const theme = useTheme();
  const reduced = useReducedMotion();

  const opacityMap = { light: 0.6, medium: 0.75, heavy: 0.9 };
  const bgOpacity = opacityMap[intensity];

  const bg = theme.scheme === 'dark'
    ? `rgba(27, 24, 32, ${bgOpacity})`
    : `rgba(255, 255, 255, ${bgOpacity})`;

  return (
    <MotiView
      from={reduced ? undefined : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        damping: 22,
        stiffness: 200,
        delay,
      }}
      style={[
        {
          backgroundColor: bg,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.scheme === 'dark'
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(255,255,255,0.6)',
          padding: 20,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
          ...(Platform.OS === 'ios' ? {} : {}),
        },
        style,
      ]}
    >
      {children}
    </MotiView>
  );
}
