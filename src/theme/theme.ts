/**
 * The design-token layer the whole app renders against.
 *
 * One centralized source of truth for colour, typography, spacing and radius, so
 * no screen invents its own values. The motion tokens live separately in
 * `src/motion` (durations/easings/springs); everything visual lives here. See
 * `docs/customer-ui-ux.md` for the design system this encodes.
 */

import { useColorScheme, type TextStyle } from 'react-native';

/** The named text roles. One ramp, used everywhere — screens never hand-roll font sizes. */
export type TypographyToken =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'overline'
  | 'button'
  | 'price';

export type Typography = Record<TypographyToken, TextStyle>;

export interface Theme {
  scheme: 'light' | 'dark';
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    /** A stronger tint of the surface for chips/inputs that need to separate from a card. */
    surfaceSunken: string;
    border: string;
    text: string;
    textMuted: string;
    /** Brand primary — the Bait Al Hana magenta from the logo. */
    primary: string;
    /** A soft, low-alpha wash of the primary for selected/tinted backgrounds. */
    primarySoft: string;
    onPrimary: string;
    /** Brand secondary — the warm orange of the shawarma / citrus. */
    secondary: string;
    secondarySoft: string;
    /** Brand accent — the blue of the "for fast food" tagline. */
    accent: string;
    success: string;
    successSoft: string;
    danger: string;
    dangerSoft: string;
    warning: string;
    warningSoft: string;
    /** Star / rating amber. */
    rating: string;
    progress: string;
    skeleton: string;
    skeletonHighlight: string;
    backdrop: string;
    /** A translucent scrim laid over food imagery so overlaid text stays legible. */
    imageScrim: string;
    /** Fixed brand background for the launch screen (theme-independent). */
    launch: string;
    /** Shadow colour for elevated surfaces (iOS shadow / Android is elevation). */
    shadow: string;
  };
  /** The named text roles. Spread onto a `<Text>`; colour is applied separately. */
  type: Typography;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  /** 4-pt spacing scale. `spacing(4)` === 16. Use this, never a raw literal. */
  spacing: (n: number) => number;
  /** A soft elevation preset for cards that should lift off the background. */
  shadow: (level?: 1 | 2 | 3) => TextStyle;
}

// Sampled from the logo.
const MAGENTA = '#E5178B';
const ORANGE = '#F47C20';
const BLUE = '#2E63A6';

const light: Theme['colors'] = {
  background: '#FCF7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F6EEF3',
  surfaceSunken: '#F0E6EE',
  border: '#EBDCE5',
  text: '#1E1A1C',
  textMuted: '#6E6167',
  primary: MAGENTA,
  primarySoft: 'rgba(229,23,139,0.10)',
  onPrimary: '#FFFFFF',
  secondary: ORANGE,
  secondarySoft: 'rgba(244,124,32,0.12)',
  accent: BLUE,
  success: '#2E9E5B',
  successSoft: 'rgba(46,158,91,0.12)',
  danger: '#D6453B',
  dangerSoft: 'rgba(214,69,59,0.12)',
  warning: '#E08600',
  warningSoft: 'rgba(224,134,0,0.14)',
  rating: '#F5A623',
  progress: MAGENTA,
  skeleton: '#EFE6EC',
  skeletonHighlight: '#F8F1F5',
  backdrop: 'rgba(30,20,26,0.45)',
  imageScrim: 'rgba(20,12,18,0.28)',
  launch: '#FFFFFF',
  shadow: '#2A1220',
};

const dark: Theme['colors'] = {
  background: '#121016',
  surface: '#1B1820',
  surfaceAlt: '#262230',
  surfaceSunken: '#2E2839',
  border: '#342D3C',
  text: '#F5F1F3',
  textMuted: '#A79CA6',
  primary: '#F23BA0',
  primarySoft: 'rgba(242,59,160,0.16)',
  onPrimary: '#FFFFFF',
  secondary: '#F78F3D',
  secondarySoft: 'rgba(247,143,61,0.16)',
  accent: '#5C8BD6',
  success: '#3CC06E',
  successSoft: 'rgba(60,192,110,0.16)',
  danger: '#F0655B',
  dangerSoft: 'rgba(240,101,91,0.16)',
  warning: '#F2A93B',
  warningSoft: 'rgba(242,169,59,0.16)',
  rating: '#F7B23B',
  progress: '#F23BA0',
  skeleton: '#262230',
  skeletonHighlight: '#302B3A',
  backdrop: 'rgba(0,0,0,0.6)',
  imageScrim: 'rgba(0,0,0,0.35)',
  launch: '#FFFFFF',
  shadow: '#000000',
};

/**
 * The type ramp. Sizes stay readable on small screens (nothing below 12); the
 * heavier weights carry hierarchy so the layout doesn't rely on size alone.
 */
const TYPE: Typography = {
  display: { fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: '800', lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontSize: 21, fontWeight: '800', lineHeight: 27, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700', lineHeight: 23 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 19 },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  overline: { fontSize: 11, fontWeight: '700', lineHeight: 14, letterSpacing: 1.1 },
  button: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  price: { fontSize: 16, fontWeight: '800', lineHeight: 20 },
};

const BASE = {
  type: TYPE,
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  spacing: (n: number) => n * 4,
};

function makeShadow(shadowColor: string) {
  return (level: 1 | 2 | 3 = 1): TextStyle => {
    const presets = {
      1: { shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, offset: 3 },
      2: { shadowOpacity: 0.12, shadowRadius: 16, elevation: 5, offset: 6 },
      3: { shadowOpacity: 0.18, shadowRadius: 24, elevation: 9, offset: 10 },
    } as const;
    const p = presets[level];
    return {
      shadowColor,
      shadowOpacity: p.shadowOpacity,
      shadowRadius: p.shadowRadius,
      shadowOffset: { width: 0, height: p.offset },
      elevation: p.elevation,
    };
  };
}

export function buildTheme(scheme: 'light' | 'dark'): Theme {
  const colors = scheme === 'dark' ? dark : light;
  return { scheme, colors, ...BASE, shadow: makeShadow(colors.shadow) };
}

/** The active theme, following the OS light/dark setting. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return buildTheme(scheme === 'dark' ? 'dark' : 'light');
}
