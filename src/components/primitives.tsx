import React from 'react';
import { StyleProp, TextInput, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PressableScale } from '../motion';
import { StatusTone } from '../features/order/order-status.model';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

/** Maps a status tone to its colour pair (foreground + soft background). */
export function useToneColors(tone: StatusTone): { fg: string; bg: string } {
  const theme = useTheme();
  switch (tone) {
    case 'success':
      return { fg: theme.colors.success, bg: theme.colors.successSoft };
    case 'danger':
      return { fg: theme.colors.danger, bg: theme.colors.dangerSoft };
    case 'warning':
      return { fg: theme.colors.warning, bg: theme.colors.warningSoft };
    case 'progress':
      return { fg: theme.colors.primary, bg: theme.colors.primarySoft };
    case 'neutral':
    default:
      return { fg: theme.colors.textMuted, bg: theme.colors.surfaceAlt };
  }
}

/** A selectable pill — categories, filters, quick chips. */
export function Chip({
  label,
  selected,
  onPress,
  leading,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leading?: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 15,
        borderRadius: theme.radius.pill,
        backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
        borderWidth: 1.5,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
      }}
    >
      {leading}
      <AppText variant="bodySmall" weight="700" color={selected ? 'onPrimary' : 'text'}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** A small count/label badge. Tone-coloured, soft background. */
export function Badge({
  label,
  tone = 'progress',
  solid,
}: {
  label: string;
  tone?: StatusTone;
  solid?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const { fg, bg } = useToneColors(tone);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: solid ? fg : bg,
        borderRadius: theme.radius.pill,
        paddingVertical: 4,
        paddingHorizontal: 10,
      }}
    >
      <AppText variant="caption" weight="700" style={{ color: solid ? theme.colors.onPrimary : fg }}>
        {label}
      </AppText>
    </View>
  );
}

/** An order/payment status pill, driven by a tone. */
export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }): React.JSX.Element {
  return <Badge label={label} tone={tone} />;
}

function SearchIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * The search bar. Two modes: a live input (`onChangeText`), or a tappable
 * button that navigates to the search screen (`onPress`, read-only).
 */
export function SearchBar({
  value,
  onChangeText,
  onPress,
  placeholder = 'Search burgers, chicken, fries…',
  autoFocus,
  onClear,
}: {
  value?: string;
  onChangeText?: (t: string) => void;
  onPress?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  onClear?: () => void;
}): React.JSX.Element {
  const theme = useTheme();

  const inner = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.pill,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        paddingHorizontal: 16,
        height: 48,
      }}
    >
      <SearchIcon color={theme.colors.textMuted} />
      {onPress ? (
        <AppText variant="body" color="textMuted" style={{ flex: 1 }} numberOfLines={1}>
          {placeholder}
        </AppText>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          autoFocus={autoFocus}
          returnKeyType="search"
          style={{ flex: 1, fontSize: 15, color: theme.colors.text, paddingVertical: 0 }}
        />
      )}
      {onClear && value ? (
        <PressableScale accessibilityRole="button" accessibilityLabel="Clear search" onPress={onClear}>
          <AppText variant="body" color="textMuted" weight="700">
            ✕
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale accessibilityRole="search" accessibilityLabel="Search" onPress={onPress}>
        {inner}
      </PressableScale>
    );
  }
  return inner;
}

/** A section header with an optional "See all" action. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}
    >
      <AppText variant="h3">{title}</AppText>
      {actionLabel && onAction ? (
        <PressableScale accessibilityRole="button" onPress={onAction}>
          <AppText variant="bodySmall" weight="700" color="primary">
            {actionLabel}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** A label/value row for price breakdowns. */
export function PriceRow({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: 'default' | 'discount';
}): React.JSX.Element {
  const theme = useTheme();
  const valueColor = tone === 'discount' ? theme.colors.success : theme.colors.text;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <AppText variant={emphasis ? 'h3' : 'body'} color={emphasis ? 'text' : 'textMuted'}>
        {label}
      </AppText>
      <AppText variant={emphasis ? 'price' : 'body'} weight={emphasis ? '800' : '600'} style={{ color: valueColor }}>
        {value}
      </AppText>
    </View>
  );
}

function Star({ filled, color, muted, size }: { filled: boolean; color: string; muted: string; size: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L3.6 9.3l6.5-.9L12 2.5z"
        fill={filled ? color : muted}
        stroke={filled ? color : muted}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** A star rating display, optionally with a numeric value and review count. */
export function Rating({
  value,
  count,
  size = 13,
  showValue = true,
}: {
  value: number;
  count?: number;
  size?: number;
  showValue?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Star filled color={theme.colors.rating} muted={theme.colors.border} size={size} />
      {showValue ? (
        <AppText variant="caption" weight="700">
          {value.toFixed(1)}
        </AppText>
      ) : null}
      {count !== undefined ? (
        <AppText variant="caption" color="textMuted">
          ({count})
        </AppText>
      ) : null}
    </View>
  );
}

/** A horizontally-scrolling rail wrapper with consistent gutters. */
export function Rail({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  return <View style={[{ gap: 12 }, style]}>{children}</View>;
}
