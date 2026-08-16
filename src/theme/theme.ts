/**
 * A small design-token layer the motion components render against.
 *
 * This is intentionally minimal — the full design system (typography scale,
 * component tokens, Arabic/RTL type ramp) lands with the app screens. What is
 * here is enough for the motion primitives and the two hero components to look
 * finished in the demo, and to prove the light/dark theming path.
 */

import { useColorScheme } from 'react-native';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    /** Brand accent — a warm saffron, evoking food without copying any brand. */
    primary: string;
    onPrimary: string;
    success: string;
    danger: string;
    warning: string;
    progress: string;
    skeleton: string;
    skeletonHighlight: string;
    backdrop: string;
  };
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  spacing: (n: number) => number;
}

const PRIMARY = '#E8A33D';

const light: Theme['colors'] = {
  background: '#FBF8F3',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EEE6',
  border: '#E7E0D5',
  text: '#1C1B18',
  textMuted: '#6C665C',
  primary: PRIMARY,
  onPrimary: '#1C1206',
  success: '#2E9E5B',
  danger: '#D6453B',
  warning: '#E08A1E',
  progress: '#E8A33D',
  skeleton: '#ECE6DC',
  skeletonHighlight: '#F6F1E8',
  backdrop: 'rgba(20,18,14,0.45)',
};

const dark: Theme['colors'] = {
  background: '#0E0F13',
  surface: '#181A20',
  surfaceAlt: '#212430',
  border: '#2C3040',
  text: '#F4F3F0',
  textMuted: '#9A9DA8',
  primary: PRIMARY,
  onPrimary: '#1C1206',
  success: '#3CC06E',
  danger: '#F0655B',
  warning: '#F0A93C',
  progress: '#E8A33D',
  skeleton: '#20232C',
  skeletonHighlight: '#2A2E39',
  backdrop: 'rgba(0,0,0,0.6)',
};

const BASE = {
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  spacing: (n: number) => n * 4,
};

export function buildTheme(scheme: 'light' | 'dark'): Theme {
  return { scheme, colors: scheme === 'dark' ? dark : light, ...BASE };
}

/** The active theme, following the OS light/dark setting. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return buildTheme(scheme === 'dark' ? 'dark' : 'light');
}
