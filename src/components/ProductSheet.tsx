import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { MenuProduct } from '../api/types';
import { useI18n } from '../i18n';
import { BottomSheet, PressableScale } from '../motion';
import { useTheme } from '../theme/theme';
import { formatSar } from '../util/money';
import { PrimaryButton } from './ui';

interface Props {
  product: MenuProduct;
  visible: boolean;
  onClose: () => void;
  onAdd: (variantId: string | null, addonIds: string[], quantity: number) => void;
}

export function ProductSheet({ product, visible, onClose, onAdd }: Props): React.JSX.Element {
  const theme = useTheme();
  const { t } = useI18n();

  const hasVariants = product.variants.length > 1;
  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0] ?? null;

  const [selectedVariant, setSelectedVariant] = useState<string | null>(defaultVariant?.id ?? null);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);

  const toggleAddon = (id: string): void => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const variantPrice = product.variants.find((v) => v.id === selectedVariant)?.priceMinor ?? product.priceMinor;
  const addonTotal = product.modifierGroups
    .flatMap((g) => g.addons)
    .filter((a) => selectedAddons.has(a.id))
    .reduce((sum, a) => sum + a.priceMinor, 0);
  const lineTotal = (variantPrice + addonTotal) * quantity;

  const canAdd = product.modifierGroups.every((g) => {
    if (!g.isRequired) return true;
    const count = g.addons.filter((a) => selectedAddons.has(a.id)).length;
    return count >= g.minSelections;
  });

  const handleAdd = (): void => {
    onAdd(selectedVariant, [...selectedAddons], quantity);
    setSelectedAddons(new Set());
    setQuantity(1);
    setSelectedVariant(defaultVariant?.id ?? null);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView style={{ maxHeight: 400 }}>
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
          {product.name}
        </Text>
        {product.description ? (
          <Text style={{ color: theme.colors.textMuted, marginBottom: 8 }}>{product.description}</Text>
        ) : null}
        <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '700', marginBottom: 16 }}>
          {formatSar(product.priceMinor)}
        </Text>

        {hasVariants ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '700', marginBottom: 8 }}>
              {t('selectVariant')}
            </Text>
            {product.variants.map((v) => {
              const active = v.id === selectedVariant;
              return (
                <PressableScale
                  key={v.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedVariant(v.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 20, height: 20, borderRadius: 10,
                      borderWidth: 2,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {active ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary }} /> : null}
                  </View>
                  <Text style={{ color: theme.colors.text, flex: 1, fontWeight: '600' }}>{v.name}</Text>
                  <Text style={{ color: theme.colors.textMuted }}>{formatSar(v.priceMinor)}</Text>
                </PressableScale>
              );
            })}
          </View>
        ) : null}

        {product.modifierGroups.map((group) => (
          <View key={group.id} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{group.name}</Text>
              <Text style={{ color: group.isRequired ? theme.colors.danger : theme.colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                {group.isRequired ? t('required') : t('optional')}
              </Text>
            </View>
            {group.addons.map((addon) => {
              const active = selectedAddons.has(addon.id);
              return (
                <PressableScale
                  key={addon.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => toggleAddon(addon.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      borderWidth: 2,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      backgroundColor: active ? theme.colors.primary : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {active ? <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: '800' }}>✓</Text> : null}
                  </View>
                  <Text style={{ color: theme.colors.text, flex: 1 }}>{addon.name}</Text>
                  <Text style={{ color: theme.colors.textMuted }}>+{formatSar(addon.priceMinor)}</Text>
                </PressableScale>
              );
            })}
          </View>
        ))}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: theme.colors.surfaceAlt,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700' }}>-</Text>
          </PressableScale>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800' }}>{quantity}</Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
            onPress={() => setQuantity(quantity + 1)}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: theme.colors.surfaceAlt,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700' }}>+</Text>
          </PressableScale>
        </View>
      </ScrollView>

      <PrimaryButton
        label={`${t('addToCart')} · ${formatSar(lineTotal)}`}
        onPress={handleAdd}
        disabled={!canAdd}
      />
    </BottomSheet>
  );
}
