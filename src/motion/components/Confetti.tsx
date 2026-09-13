import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '../useReducedMotion';

const PARTICLE_COUNT = 24;
const COLORS = ['#E5178B', '#F47C20', '#2E63A6', '#2E9E5B', '#F23BA0', '#5C8BD6'];

interface ParticleProps {
  color: string;
  angle: number;
  distance: number;
  delay: number;
  size: number;
}

function Particle({ color, angle, distance, delay, size }: ParticleProps): React.JSX.Element {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(600, withTiming(0, { duration: 400 })),
    ));
    progress.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
  }, [progress, opacity, delay]);

  const style = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * distance * progress.value;
    const dy = Math.sin(angle) * distance * progress.value - 40 * progress.value;
    return {
      opacity: opacity.value,
      transform: [
        { translateX: dx },
        { translateY: dy },
        { scale: 1 - progress.value * 0.5 },
        { rotate: `${progress.value * 360}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export interface ConfettiProps {
  active: boolean;
  origin?: { x: number; y: number };
}

export function Confetti({ active, origin }: ConfettiProps): React.JSX.Element | null {
  const reduced = useReducedMotion();

  const particles = useMemo(() => {
    if (!active || reduced) return [];
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      color: COLORS[i % COLORS.length]!,
      angle: (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
      distance: 60 + Math.random() * 80,
      delay: Math.random() * 200,
      size: 6 + Math.random() * 6,
    }));
  }, [active, reduced]);

  if (!active || reduced) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: origin?.x ?? '50%',
        top: origin?.y ?? '40%',
        zIndex: 100,
      }}
      pointerEvents="none"
    >
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </View>
  );
}
