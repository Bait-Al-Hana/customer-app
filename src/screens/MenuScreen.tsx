import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { ProductSheet } from '../components/ProductSheet';
import { Card, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useI18n, useLocalName } from '../i18n';
import { CartBadge, EmptyState, ErrorState, PressableScale, Skeleton } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';
import type { MenuProduct } from '../api/types';

export function MenuScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Menu'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, count, dispatch } = useCart();
  const { t } = useI18n();
  const localName = useLocalName();
  const { branchId, branchName } = route.params;
  const { data, loading, error, reload } = useAsync(() => api.menu(branchId), [branchId]);

  const [sheetProduct, setSheetProduct] = useState<MenuProduct | null>(null);

  const quickAdd = (product: MenuProduct): void => {
    if (product.variants.length > 1 || product.modifierGroups.length > 0) {
      setSheetProduct(product);
      return;
    }
    dispatch({
      type: 'ADD',
      branchId,
      line: {
        productId: product.id,
        productName: product.name,
        unitPriceMinor: product.priceMinor,
        addonIds: [],
        addonNames: [],
      },
    });
  };

  const handleSheetAdd = (variantId: string | null, addonIds: string[], quantity: number): void => {
    if (!sheetProduct) return;
    const variant = variantId ? sheetProduct.variants.find((v) => v.id === variantId) : null;
    const addonNames = sheetProduct.modifierGroups
      .flatMap((g) => g.addons)
      .filter((a) => addonIds.includes(a.id))
      .map((a) => a.name);
    const addonTotal = sheetProduct.modifierGroups
      .flatMap((g) => g.addons)
      .filter((a) => addonIds.includes(a.id))
      .reduce((s, a) => s + a.priceMinor, 0);
    dispatch({
      type: 'ADD',
      branchId,
      line: {
        productId: sheetProduct.id,
        productName: sheetProduct.name,
        unitPriceMinor: (variant?.priceMinor ?? sheetProduct.priceMinor) + addonTotal,
        addonIds,
        addonNames,
      },
      quantity,
    });
  };

  const cartButton = (
    <PressableScale accessibilityRole="button" accessibilityLabel={t('viewCart')} onPress={() => navigation.navigate('Cart')}>
      <View>
        <Text style={{ fontSize: 24 }}>🛒</Text>
        <View style={{ position: 'absolute', top: -6, right: -10 }}>
          <CartBadge count={count} />
        </View>
      </View>
    </PressableScale>
  );

  return (
    <Screen title={branchName} onBack={() => navigation.goBack()} right={cartButton}>
      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={72} radius={theme.radius.md} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title={t('menuLoadError')} message={error.message} actionLabel={t('retry')} onAction={reload} />
      ) : !data || data.categories.length === 0 ? (
        <EmptyState title={t('menuEmpty')} message={t('menuEmptyMsg')} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: count > 0 ? 96 : 24 }}>
          {data.categories.map((category) => (
            <View key={category.id} style={{ marginBottom: 20 }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>
                {localName(category.name, category.nameAr)}
              </Text>
              <View style={{ gap: 10 }}>
                {category.products.map((product) => (
                  <PressableScale
                    key={product.id}
                    accessibilityRole="button"
                    onPress={() => quickAdd(product)}
                  >
                    <Card>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>
                            {localName(product.name, product.nameAr)}
                          </Text>
                          {product.description ? (
                            <Text style={{ color: theme.colors.textMuted, marginTop: 2 }} numberOfLines={2}>
                              {product.description}
                            </Text>
                          ) : null}
                          <Text style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 6 }}>
                            {formatSar(product.priceMinor)}
                          </Text>
                          {product.modifierGroups.length > 0 || product.variants.length > 1 ? (
                            <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                              {t('selectVariant')}
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={{
                            backgroundColor: theme.colors.primary,
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: theme.colors.onPrimary, fontSize: 24, fontWeight: '700' }}>+</Text>
                        </View>
                      </View>
                    </Card>
                  </PressableScale>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {count > 0 && cart.branchId === branchId ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 20 }}>
          <PressableScale
            accessibilityRole="button"
            onPress={() => navigation.navigate('Cart')}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.pill,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '800', fontSize: 16 }}>{t('viewCart')}</Text>
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '800', fontSize: 16 }}>
              {count} {count === 1 ? t('item') : t('items')}
            </Text>
          </PressableScale>
        </View>
      ) : null}

      {sheetProduct ? (
        <ProductSheet
          product={sheetProduct}
          visible={!!sheetProduct}
          onClose={() => setSheetProduct(null)}
          onAdd={handleSheetAdd}
        />
      ) : null}
    </Screen>
  );
}
