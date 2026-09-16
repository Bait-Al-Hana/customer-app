import React from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useMotion } from '../MotionProvider';
import { PressableScale } from './PressableScale';

export interface TabOption<T extends string> {
  value: T;
  label: string;
}

export interface AnimatedTabBarProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

/**
 * A segmented tab control with a sliding pill indicator. The pill
 * springs to the active tab, giving a physical sense of selection.
 */
export function AnimatedTabBar<T extends string>({
  options,
  value,
  onChange,
}: AnimatedTabBarProps<T>): React.JSX.Element {
  const theme = useTheme();
  const { spring } = useMotion();
  const activeIndex = options.findIndex((o) => o.value === value);
  const position = useSharedValue(activeIndex >= 0 ? activeIndex : 0);

  const nextIndex = options.findIndex((o) => o.value === value);
  if (nextIndex >= 0 && nextIndex !== position.value) {
    position.value = withSpring(nextIndex, spring('standard'));
  }

  const pillStyle = useAnimatedStyle(() => ({
    left: `${(position.value / options.length) * 100}%`,
    width: `${100 / options.length}%`,
  }));

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.lg,
        padding: 4,
        position: 'relative',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 4,
            bottom: 4,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          },
          pillStyle,
        ]}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              zIndex: 1,
            }}
          >
            <Text
              style={{
                color: active ? theme.colors.onPrimary : theme.colors.textMuted,
                fontWeight: '700',
                fontSize: 15,
              }}
            >
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
