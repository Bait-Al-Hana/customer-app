import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { MotiView } from 'moti';

import { useTheme } from '../../theme/theme';
import { useReducedMotion } from '../useReducedMotion';

export interface MotiCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  from?: 'bottom' | 'left' | 'right' | 'scale';
}

export function MotiCard({
  children,
  style,
  delay = 0,
  from = 'bottom',
}: MotiCardProps): React.JSX.Element {
  const theme = useTheme();
  const reduced = useReducedMotion();

  const initialTranslateY = from === 'bottom' ? 20 : 0;
  const initialTranslateX = from === 'left' ? -20 : from === 'right' ? 20 : 0;
  const initialScale = from === 'scale' ? 0.9 : 1;

  return (
    <MotiView
      from={reduced ? undefined : {
        opacity: 0,
        translateY: initialTranslateY,
        translateX: initialTranslateX,
        scale: initialScale,
      }}
      animate={{
        opacity: 1,
        translateY: 0,
        translateX: 0,
        scale: 1,
      }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 200,
        delay,
      }}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 16,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </MotiView>
  );
}
