import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export interface GradientSurfaceProps {
  colors: [string, string] | [string, string, string];
  /** Gradient direction. Defaults to a gentle top-left → bottom-right diagonal. */
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

let _id = 0;

/**
 * A rounded surface with a linear-gradient fill, drawn with `react-native-svg`.
 *
 * Purpose: give hero surfaces (the promo banner, the loyalty card, the success
 * screen) real depth without pulling in a native gradient dependency, and
 * without the "random gradient everywhere" the brief warns against — it is used
 * only where a brand moment earns it. The gradient is a single GPU-cheap vector
 * rect; content sits above it in normal flow.
 */
export function GradientSurface({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  radius = 0,
  style,
  children,
}: GradientSurfaceProps): React.JSX.Element {
  // Stable, unique gradient id per instance so multiple surfaces don't collide.
  const id = React.useMemo(() => `grad_${(_id += 1)}`, []);
  const stops =
    colors.length === 3
      ? [
          { offset: '0', color: colors[0] },
          { offset: '0.55', color: colors[1] },
          { offset: '1', color: colors[2] },
        ]
      : [
          { offset: '0', color: colors[0] },
          { offset: '1', color: colors[1] },
        ];

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1={start.x} y1={start.y} x2={end.x} y2={end.y}>
            {stops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
