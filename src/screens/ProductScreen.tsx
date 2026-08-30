import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCart } from '../cart/CartProvider';
import { AppText, Button, Divider, FavoriteButton, FoodImage, Rating, TextField } from '../components';
import { glyphFor } from '../components/FoodImage';
import { ratingCountFor, ratingFor } from '../data/ratings';
import { toFoodCard } from '../data/menu';
import { useFavorites } from '../favorites/FavoritesProvider';
import { QuantityStepper, PressableScale } from '../motion';
import { RootStackParamList } from '../navigation/types';
import type { MenuModifierGroup } from '../api/types';
import { useTheme } from '../theme/theme';
import { formatSar } from '../util/money';

/** Product detail with size, add-ons, notes and a sticky add-to-cart CTA. */
export function ProductScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Product'>): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { branchId, product } = route.params;
  const { dispatch, notes, setNotes } = useCart();
  const favorites = useFavorites();

  const hasVariants = product.variants && product.variants.length > 0;
  const defaultVariant = hasVariants ? product.variants.find((v) => v.isDefault) ?? product.variants[0] : null;
  const [variantId, setVariantId] = useState<string | null>(defaultVariant?.id ?? null);
  // group id -> selected addon ids
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');

  const variant = product.variants?.find((v) => v.id === variantId) ?? null;
  const basePrice = variant?.priceMinor ?? product.priceMinor;

  const selectedAddons = useMemo(() => {
    const map = new Map<string, { id: string; name: string; priceMinor: number }>();
    for (const g of product.modifierGroups) {
      const ids = selected[g.id] ?? [];
      for (const a of g.addons) {
        if (ids.includes(a.id)) {
          map.set(a.id, { id: a.id, name: a.name, priceMinor: a.priceMinor });
        }
      }
    }
    return [...map.values()];
  }, [selected, product.modifierGroups]);

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.priceMinor, 0);
  const unitPrice = basePrice + addonsTotal;
  const total = unitPrice * quantity;

  const toggleAddon = (group: MenuModifierGroup, addonId: string): void => {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      const isSelected = current.includes(addonId);
      let next: string[];
      if (group.maxSelections === 1) {
        // Single-select: choosing replaces; choosing the selected one (when not
        // required) clears it.
        next = isSelected && !group.isRequired ? [] : [addonId];
      } else if (isSelected) {
        next = current.filter((id) => id !== addonId);
      } else if (current.length >= group.maxSelections) {
        next = current; // at the cap — ignore
      } else {
        next = [...current, addonId];
      }
      return { ...prev, [group.id]: next };
    });
  };

  // Required groups must meet their minimum before the item can be added.
  const unmetRequired = product.modifierGroups.filter((g) => g.isRequired && (selected[g.id]?.length ?? 0) < Math.max(1, g.minSelections));
  const canAdd = unmetRequired.length === 0;

  const add = (): void => {
    const addonIds = selectedAddons.map((a) => a.id);
    const addonNames = selectedAddons.map((a) => a.name);
    const name = variant ? `${product.name} (${variant.name})` : product.name;
    dispatch({
      type: 'ADD',
      branchId,
      quantity,
      line: {
        productId: product.id,
        productName: name,
        unitPriceMinor: unitPrice,
        addonIds,
        addonNames,
        variantId: variant?.id,
        variantName: variant?.name,
      },
    });
    // Per-item instructions have no backend field yet; fold them into the
    // order-level notes the backend does accept, tagged with the product.
    const note = instructions.trim();
    if (note) {
      const tagged = `${product.name}: ${note}`;
      setNotes(notes ? `${notes}\n${tagged}` : tagged);
    }
    navigation.goBack();
  };

  const card = toFoodCard(product);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero image with floating controls */}
        <View>
          <FoodImage uri={product.imageUrl} glyph={glyphFor(product.name)} height={280} radius={0} />
          <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => navigation.goBack()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText style={{ color: '#fff', fontSize: 24, marginTop: -2 }}>‹</AppText>
            </PressableScale>
            <FavoriteButton active={favorites.isFavorite(product.id)} onToggle={() => favorites.toggle(card)} onImage size={40} />
          </View>
        </View>

        <View style={{ padding: 16 }}>
          <AppText variant="h1">{product.name}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <Rating value={ratingFor(product.id)} count={ratingCountFor(product.id)} size={15} />
            <AppText variant="price" color="primary">
              {formatSar(basePrice)}
            </AppText>
          </View>
          {product.description ? (
            <AppText variant="body" color="textMuted" style={{ marginTop: 12 }}>
              {product.description}
            </AppText>
          ) : null}

          {/* Variants (size) */}
          {hasVariants ? (
            <ChoiceGroup
              title="Choose size"
              required
              hint="Required · pick 1"
            >
              {product.variants.map((v) => {
                const active = v.id === variantId;
                const delta = v.priceMinor - (defaultVariant?.priceMinor ?? product.priceMinor);
                return (
                  <OptionRow
                    key={v.id}
                    single
                    selected={active}
                    label={v.name}
                    trailing={delta !== 0 ? `${delta > 0 ? '+' : '−'} ${formatSar(Math.abs(delta))}` : formatSar(v.priceMinor)}
                    onPress={() => setVariantId(v.id)}
                  />
                );
              })}
            </ChoiceGroup>
          ) : null}

          {/* Modifier groups (add-ons) */}
          {product.modifierGroups.map((g) => {
            const chosen = selected[g.id] ?? [];
            const single = g.maxSelections === 1;
            const hint = single
              ? g.isRequired
                ? 'Required · pick 1'
                : 'Optional · pick 1'
              : `${g.isRequired ? 'Required' : 'Optional'} · up to ${g.maxSelections}`;
            return (
              <ChoiceGroup key={g.id} title={g.name} required={g.isRequired} hint={hint}>
                {g.addons.map((a) => {
                  const active = chosen.includes(a.id);
                  const atCap = !single && !active && chosen.length >= g.maxSelections;
                  return (
                    <OptionRow
                      key={a.id}
                      single={single}
                      selected={active}
                      disabled={atCap}
                      label={a.name}
                      trailing={a.priceMinor > 0 ? `+ ${formatSar(a.priceMinor)}` : 'Free'}
                      onPress={() => toggleAddon(g, a.id)}
                    />
                  );
                })}
              </ChoiceGroup>
            );
          })}

          {/* Special instructions */}
          <View style={{ marginTop: 20 }}>
            <AppText variant="h3" style={{ marginBottom: 10 }}>
              Special instructions
            </AppText>
            <TextField
              value={instructions}
              onChangeText={setInstructions}
              placeholder="e.g. no onions, extra spicy…"
              maxLength={200}
              multiline
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View style={{ backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, paddingHorizontal: 6, paddingVertical: 4 }}>
          <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={canAdd ? `Add to cart · ${formatSar(total)}` : `Select ${unmetRequired[0]?.name ?? 'options'}`}
            onPress={add}
            disabled={!canAdd}
          />
        </View>
      </View>
    </View>
  );
}

/** A titled group of selectable options with a hint (required / pick-N). */
function ChoiceGroup({
  title,
  hint,
  required,
  children,
}: {
  title: string;
  hint: string;
  required?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <AppText variant="h3">{title}</AppText>
        {required ? (
          <View style={{ backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
            <AppText variant="caption" weight="700" color="primary">
              Required
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="caption" color="textMuted" style={{ marginBottom: 10 }}>
        {hint}
      </AppText>
      <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, overflow: 'hidden' }}>
        {React.Children.map(children, (child, i) => (
          <>
            {i > 0 ? <Divider /> : null}
            {child}
          </>
        ))}
      </View>
    </View>
  );
}

/** A single selectable option row (radio for single-select, checkbox for multi). */
function OptionRow({
  label,
  trailing,
  selected,
  single,
  disabled,
  onPress,
}: {
  label: string;
  trailing?: string;
  selected: boolean;
  single?: boolean;
  disabled?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole={single ? 'radio' : 'checkbox'}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: single ? 11 : 6,
          borderWidth: 2,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected && !single ? theme.colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && single ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: theme.colors.primary }} /> : null}
        {selected && !single ? <AppText style={{ color: theme.colors.onPrimary, fontSize: 13 }} weight="800">✓</AppText> : null}
      </View>
      <AppText variant="body" weight="600" style={{ flex: 1 }}>
        {label}
      </AppText>
      {trailing ? (
        <AppText variant="bodySmall" color={selected ? 'primary' : 'textMuted'} weight="700">
          {trailing}
        </AppText>
      ) : null}
    </PressableScale>
  );
}
