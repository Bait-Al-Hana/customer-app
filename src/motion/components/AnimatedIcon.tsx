import React from 'react';
import { Text, View } from 'react-native';
import { MotiView } from 'moti';

import { useTheme } from '../../theme/theme';
import { useReducedMotion } from '../useReducedMotion';

export interface AnimatedIconProps {
  icon: string;
  size?: number;
  bgColor?: string;
  delay?: number;
  bounce?: boolean;
}

export function AnimatedIcon({
  icon,
  size = 56,
  bgColor,
  delay = 0,
  bounce = true,
}: AnimatedIconProps): React.JSX.Element {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const bg = bgColor ?? theme.colors.primary + '14';

  return (
    <MotiView
      from={reduced ? undefined : {
        opacity: 0,
        scale: 0.3,
        rotate: '-15deg',
      }}
      animate={{
        opacity: 1,
        scale: 1,
        rotate: '0deg',
      }}
      transition={{
        type: 'spring',
        damping: bounce ? 10 : 20,
        stiffness: 200,
        delay,
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.45 }}>{icon}</Text>
      </View>
    </MotiView>
  );
}
