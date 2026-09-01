import React from 'react';
import { Text, View } from 'react-native';
import { MotiView } from 'moti';

import { useTheme } from '../../theme/theme';
import { useReducedMotion } from '../useReducedMotion';

export interface StepIndicatorProps {
  steps: string[];
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps): React.JSX.Element {
  const theme = useTheme();
  const reduced = useReducedMotion();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;

        return (
          <React.Fragment key={i}>
            <MotiView
              animate={{
                backgroundColor: done
                  ? theme.colors.primary
                  : active
                    ? theme.colors.primary
                    : theme.colors.border,
                scale: active ? 1 : 0.85,
              }}
              transition={{
                type: 'spring',
                damping: 20,
                stiffness: 200,
              }}
              style={{
                width: active ? 36 : 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: done || active ? theme.colors.onPrimary : theme.colors.textMuted,
                  fontWeight: '800',
                  fontSize: 12,
                }}
              >
                {done ? '✓' : `${i + 1}`}
              </Text>
            </MotiView>
            {i < steps.length - 1 ? (
              <MotiView
                animate={{
                  backgroundColor: done ? theme.colors.primary : theme.colors.border,
                  scaleX: done ? 1 : 0.5,
                }}
                transition={reduced ? { type: 'timing', duration: 0 } : { type: 'spring', damping: 20, stiffness: 200 }}
                style={{ width: 20, height: 2, borderRadius: 1 }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}
