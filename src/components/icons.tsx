import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The app's line-icon set — one consistent 24×24, 2px-stroke family.
 *
 * Icons are vectors (`react-native-svg`), so they stay crisp at any size, tint
 * to any theme colour, and add nothing to the bundle. Each takes `color`/`size`
 * and `filled` where a filled variant reads as "active" (used by the tab bar).
 */
export interface IconProps {
  color: string;
  size?: number;
  filled?: boolean;
}

function base(size = 24) {
  return { width: size, height: size, viewBox: '0 0 24 24' } as const;
}

export function HomeIcon({ color, size, filled }: IconProps): React.JSX.Element {
  return (
    <Svg {...base(size)} fill={filled ? color : 'none'}>
      <Path
        d="M3 10.5L12 3l9 7.5M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function SearchIcon({ color, size }: IconProps): React.JSX.Element {
  return (
    <Svg {...base(size)} fill="none">
      <Path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ReceiptIcon({ color, size, filled }: IconProps): React.JSX.Element {
  return (
    <Svg {...base(size)} fill={filled ? color : 'none'}>
      <Path
        d="M6 2h12a1 1 0 011 1v18l-3-2-3 2-3-2-3 2V3a1 1 0 011-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
      <Path d="M9 8h6M9 12h6" stroke={filled ? '#fff' : color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function TagIcon({ color, size, filled }: IconProps): React.JSX.Element {
  return (
    <Svg {...base(size)} fill={filled ? color : 'none'}>
      <Path
        d="M20.5 13.5l-7 7a2 2 0 01-2.8 0l-7-7A2 2 0 013 12V5a2 2 0 012-2h7a2 2 0 011.4.6l7 7a2 2 0 01.1 2.9z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
      <Circle cx={8} cy={8} r={1.6} fill={filled ? '#fff' : color} />
    </Svg>
  );
}

export function UserIcon({ color, size, filled }: IconProps): React.JSX.Element {
  return (
    <Svg {...base(size)} fill={filled ? color : 'none'}>
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} fill={filled ? color : 'none'} />
      <Path d="M4 21a8 8 0 0116 0" stroke={color} strokeWidth={2} strokeLinecap="round" fill={filled ? color : 'none'} />
    </Svg>
  );
}

export function CartIcon({ color, size }: IconProps): React.JSX.Element {
  return (
    <Svg {...base(size)} fill="none">
      <Path
        d="M3 4h2l2.4 12.2a1 1 0 001 .8h9.2a1 1 0 001-.8L21 8H6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={9} cy={20} r={1.5} fill={color} />
      <Circle cx={18} cy={20} r={1.5} fill={color} />
    </Svg>
  );
}

export function ChevronRight({ color, size = 20 }: IconProps): React.JSX.Element {
  return (
    <Svg {...base(size)} fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PinIcon({ color, size = 16 }: IconProps): React.JSX.Element {
  return (
    <Svg {...base(size)} fill="none">
      <Path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={12} cy={10} r={2.5} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function BellIcon({ color, size = 22 }: IconProps): React.JSX.Element {
  return (
    <Svg {...base(size)} fill="none">
      <Path
        d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
