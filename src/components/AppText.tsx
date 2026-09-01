import React from 'react';
import { I18nManager, StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { TypographyToken, useTheme } from '../theme/theme';

export interface AppTextProps extends TextProps {
  /** The type role from the ramp. Defaults to `body`. */
  variant?: TypographyToken;
  /**
   * A colour role from the theme, or a raw colour string. Defaults to `text`.
   * Passing a token keeps colour on-system; a raw string is an escape hatch.
   */
  color?: keyof ReturnType<typeof useTheme>['colors'] | string;
  /** Convenience weight override without leaving the ramp's size/line-height. */
  weight?: TextStyle['fontWeight'];
  center?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * The single text primitive for the app.
 *
 * Every piece of copy goes through here so size, weight and line-height come
 * from the one typography ramp in `theme.ts` — screens never re-declare a
 * `fontSize`. Colour is a theme token by default, so text stays theme-correct in
 * light and dark without per-call-site work. RTL alignment follows
 * `I18nManager`, which is the groundwork for full Arabic support.
 */
export function AppText({
  variant = 'body',
  color = 'text',
  weight,
  center,
  style,
  ...rest
}: AppTextProps): React.JSX.Element {
  const theme = useTheme();
  const resolved =
    color in theme.colors ? theme.colors[color as keyof typeof theme.colors] : (color as string);
  return (
    <Text
      {...rest}
      style={[
        theme.type[variant],
        { color: resolved },
        weight ? { fontWeight: weight } : null,
        center ? { textAlign: 'center' } : null,
        I18nManager.isRTL ? { writingDirection: 'rtl' } : null,
        style,
      ]}
    />
  );
}
