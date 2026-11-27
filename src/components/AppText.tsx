import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { useLanguage } from '../i18n';
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
 * light and dark without per-call-site work. RTL alignment follows the chosen
 * language from `LanguageProvider`, so switching to Arabic re-aligns and
 * re-shapes text immediately — without waiting for the app restart that full
 * layout mirroring (`I18nManager`) needs.
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
  const { isRTL } = useLanguage();
  const resolved =
    color in theme.colors ? theme.colors[color as keyof typeof theme.colors] : (color as string);
  return (
    <Text
      {...rest}
      style={[
        theme.type[variant],
        { color: resolved },
        weight ? { fontWeight: weight } : null,
        // Center wins when asked; otherwise Arabic reads right-aligned.
        center ? { textAlign: 'center' } : isRTL ? { textAlign: 'right' } : null,
        isRTL ? { writingDirection: 'rtl' } : null,
        style,
      ]}
    />
  );
}
