import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { PressableScale } from '../motion';
import { PaymentMethod } from '../types/backend';
import { StatusTone } from '../features/order/order-status.model';
import { useTheme } from '../theme/theme';
import { formatSar } from '../util/money';
import { AddButton } from './AddButton';
import { AppText } from './AppText';
import { Badge } from './primitives';
import { Card } from './ui';
import { FavoriteButton } from './FavoriteButton';
import { FoodImage, glyphFor } from './FoodImage';
import { GradientSurface } from './GradientSurface';
import { PaymentMark } from './PaymentMark';
import { Rating } from './primitives';

export interface FoodCardData {
  id: string;
  name: string;
  description?: string | null;
  priceMinor: number;
  imageUrl?: string | null;
  rating?: number;
  ratingCount?: number;
  tag?: string;
  isAvailable?: boolean;
}

/** A vertical food card for horizontal rails (Popular, Recommended). Fixed width. */
export function FoodCard({
  data,
  onPress,
  onAdd,
  favorite,
  onToggleFavorite,
  width = 168,
}: {
  data: FoodCardData;
  onPress: () => void;
  onAdd: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  width?: number;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={data.name} onPress={onPress} style={{ width }}>
      <View
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
          },
          theme.shadow(1),
        ]}
      >
        <View>
          <FoodImage uri={data.imageUrl} glyph={glyphFor(data.name)} height={112} radius={0} />
          {data.tag ? (
            <View style={{ position: 'absolute', top: 8, left: 8 }}>
              <Badge label={data.tag} tone="progress" solid />
            </View>
          ) : null}
          {onToggleFavorite ? (
            <View style={{ position: 'absolute', top: 6, right: 6 }}>
              <FavoriteButton active={!!favorite} onToggle={onToggleFavorite} onImage size={30} />
            </View>
          ) : null}
        </View>
        <View style={{ padding: 12 }}>
          <AppText variant="h3" numberOfLines={1} style={{ fontSize: 15 }}>
            {data.name}
          </AppText>
          {data.rating !== undefined ? (
            <View style={{ marginTop: 4 }}>
              <Rating value={data.rating} count={data.ratingCount} />
            </View>
          ) : data.description ? (
            <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 4 }}>
              {data.description}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <AppText variant="price" color="primary">
              {formatSar(data.priceMinor)}
            </AppText>
            <AddButton onPress={onAdd} size={34} accessibilityLabel={`Add ${data.name}`} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

/** A horizontal food row for the menu list: image, details, add button. */
export function FoodListItem({
  data,
  onPress,
  onAdd,
  favorite,
  onToggleFavorite,
}: {
  data: FoodCardData;
  onPress: () => void;
  onAdd: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const unavailable = data.isAvailable === false;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={data.name} onPress={onPress} style={{ opacity: unavailable ? 0.6 : 1 }}>
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', padding: 12, gap: 12 }}>
          <FoodImage uri={data.imageUrl} glyph={glyphFor(data.name)} height={92} style={{ width: 92 }} radius={theme.radius.md} />
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="h3" numberOfLines={1} style={{ fontSize: 15, flex: 1 }}>
                  {data.name}
                </AppText>
                {unavailable ? <Badge label="Unavailable" tone="danger" solid /> : null}
              </View>
              {data.description ? (
                <AppText variant="bodySmall" color="textMuted" numberOfLines={2} style={{ marginTop: 2 }}>
                  {data.description}
                </AppText>
              ) : null}
              {data.rating !== undefined ? (
                <View style={{ marginTop: 4 }}>
                  <Rating value={data.rating} count={data.ratingCount} />
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <AppText variant="price" color={unavailable ? 'textMuted' : 'primary'}>
                {formatSar(data.priceMinor)}
              </AppText>
              {unavailable ? (
                <AppText variant="caption" color="danger" style={{ fontSize: 11 }}>Unavailable now</AppText>
              ) : (
                <AddButton onPress={onAdd} size={36} accessibilityLabel={`Add ${data.name}`} />
              )}
            </View>
          </View>
          {onToggleFavorite ? (
            <View style={{ position: 'absolute', top: 8, right: 8 }}>
              <FavoriteButton active={!!favorite} onToggle={onToggleFavorite} size={30} />
            </View>
          ) : null}
        </View>
      </Card>
    </PressableScale>
  );
}

/** A round-cornered category tile for the category rail. */
export function CategoryCard({
  name,
  imageUrl,
  glyph,
  selected,
  onPress,
}: {
  name: string;
  imageUrl?: string | null;
  glyph?: string;
  selected?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityState={{ selected: !!selected }} accessibilityLabel={name} onPress={onPress} style={{ width: 76, alignItems: 'center' }}>
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: theme.radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderWidth: 1.5,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          overflow: 'hidden',
        }}
      >
        <FoodImage uri={imageUrl} glyph={glyph ?? glyphFor(name)} height={66} radius={0} style={{ width: 66, backgroundColor: 'transparent' }} />
      </View>
      <AppText variant="caption" weight="600" numberOfLines={1} center style={{ marginTop: 6, width: 76 }} color={selected ? 'primary' : 'text'}>
        {name}
      </AppText>
    </PressableScale>
  );
}

export interface PromoBannerData {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  colors: [string, string];
  glyph?: string;
}

/** A wide gradient promo banner. Used sparingly — the hero of the home screen. */
export function PromoBanner({ data, onPress, style }: { data: PromoBannerData; onPress: () => void; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${data.title}. ${data.subtitle}`} onPress={onPress} style={style}>
      <GradientSurface colors={data.colors} radius={theme.radius.xl} style={theme.shadow(2)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, minHeight: 140 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            {data.badge ? (
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  borderRadius: theme.radius.pill,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  marginBottom: 10,
                }}
              >
                <AppText variant="overline" style={{ color: '#FFFFFF' }}>
                  {data.badge}
                </AppText>
              </View>
            ) : null}
            <AppText variant="h1" style={{ color: '#FFFFFF', fontSize: 24 }}>
              {data.title}
            </AppText>
            <AppText variant="body" style={{ color: 'rgba(255,255,255,0.92)', marginTop: 6 }}>
              {data.subtitle}
            </AppText>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#FFFFFF',
                borderRadius: theme.radius.pill,
                paddingVertical: 9,
                paddingHorizontal: 16,
                marginTop: 14,
              }}
            >
              <AppText variant="button" style={{ color: data.colors[0], fontSize: 14 }}>
                Order now
              </AppText>
            </View>
          </View>
          {data.glyph ? (
            <AppText style={{ fontSize: 64 }} accessibilityElementsHidden importantForAccessibility="no">
              {data.glyph}
            </AppText>
          ) : null}
        </View>
      </GradientSurface>
    </PressableScale>
  );
}

/** A compact order summary card (Orders list). */
export function OrderCard({
  orderNumber,
  dateLabel,
  itemsLabel,
  totalMinor,
  statusLabel,
  statusTone,
  onPress,
  onReorder,
  actionLabel,
}: {
  orderNumber: string;
  dateLabel?: string;
  itemsLabel: string;
  totalMinor: number;
  statusLabel: string;
  statusTone: StatusTone;
  onPress: () => void;
  onReorder?: () => void;
  actionLabel: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale accessibilityRole="button" onPress={onPress}>
      <Card elevated>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="h3" style={{ fontSize: 15 }}>
            {orderNumber}
          </AppText>
          <Badge label={statusLabel} tone={statusTone} />
        </View>
        <AppText variant="bodySmall" color="textMuted" style={{ marginTop: 6 }}>
          {itemsLabel}
          {dateLabel ? ` · ${dateLabel}` : ''}
        </AppText>
        <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="price">{formatSar(totalMinor)}</AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {onReorder ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Reorder ${orderNumber}`}
                onPress={onReorder}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceAlt }}
              >
                <AppText variant="bodySmall" weight="700">
                  Reorder
                </AppText>
              </PressableScale>
            ) : null}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`${actionLabel} ${orderNumber}`}
              onPress={onPress}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft }}
            >
              <AppText variant="bodySmall" weight="700" color="primary">
                {actionLabel}
              </AppText>
            </PressableScale>
          </View>
        </View>
      </Card>
    </PressableScale>
  );
}

/** A selectable saved-address row. */
export function AddressCard({
  label,
  line,
  isDefault,
  selected,
  onPress,
}: {
  label: string;
  line: string;
  isDefault?: boolean;
  selected?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: theme.radius.lg,
          borderWidth: 1.5,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: theme.colors.primary }} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText variant="h3" style={{ fontSize: 15 }}>
              {label}
            </AppText>
            {isDefault ? <Badge label="Default" tone="neutral" /> : null}
          </View>
          <AppText variant="bodySmall" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
            {line}
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

/**
 * A selectable payment-method row, marked with its brand rather than an emoji.
 *
 * It used to take a `glyph` string, and two of the five it was given did not
 * render at all off Apple platforms — see `PaymentMark`, which owns the marks
 * and the slot the licensed Apple Pay / mada artwork drops into.
 */
export function PaymentMethodCard({
  method,
  label,
  hint,
  selected,
  onPress,
}: {
  method: PaymentMethod;
  label: string;
  hint?: string;
  selected?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderRadius: theme.radius.lg,
          borderWidth: 1.5,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
        }}
      >
        <PaymentMark method={method} />
        <View style={{ flex: 1 }}>
          <AppText variant="h3" style={{ fontSize: 15 }}>
            {label}
          </AppText>
          {hint ? (
            <AppText variant="caption" color="textMuted" style={{ marginTop: 2 }}>
              {hint}
            </AppText>
          ) : null}
        </View>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: theme.colors.primary }} /> : null}
        </View>
      </View>
    </PressableScale>
  );
}
