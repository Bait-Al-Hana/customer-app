import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useCart } from '../cart/CartProvider';
import { AppText, Button, Screen } from '../components';
import { GradientSurface } from '../components/GradientSurface';
import { Offer, OFFERS, expiryLabel } from '../data/content';
import { PressableScale, Toast } from '../motion';
import { MainTabParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

/** Offers: browse promotions and apply a coupon to the current cart. */
export function OffersScreen(): React.JSX.Element {
  const theme = useTheme();
  const tabNav = useNavigation<BottomTabScreenProps<MainTabParamList>['navigation']>();
  const { count, setCouponCode } = useCart();
  const [toast, setToast] = useState<string | null>(null);

  const applyOffer = (offer: Offer): void => {
    setCouponCode(offer.code);
    if (count === 0) {
      setToast(`${offer.code} saved — add items and it applies at checkout`);
      tabNav.navigate('Home');
    } else {
      setToast(`${offer.code} applied — see it at checkout`);
    }
  };

  return (
    <Screen title="Offers" subtitle="Deals and coupons for you">
      <Toast visible={!!toast} message={toast ?? ''} tone="success" onHide={() => setToast(null)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        {OFFERS.map((offer) => (
          <View key={offer.id}>
            <GradientSurface colors={offer.colors} radius={theme.radius.xl} style={theme.shadow(2)}>
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <AppText variant="h1" style={{ color: '#fff', fontSize: 26 }}>
                      {offer.title}
                    </AppText>
                    <AppText variant="body" style={{ color: 'rgba(255,255,255,0.92)', marginTop: 6 }}>
                      {offer.description}
                    </AppText>
                  </View>
                  <AppText style={{ fontSize: 44 }}>{offer.glyph}</AppText>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: 'rgba(255,255,255,0.22)',
                      borderRadius: theme.radius.md,
                      borderStyle: 'dashed',
                      borderWidth: 1.5,
                      borderColor: 'rgba(255,255,255,0.6)',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                    }}
                  >
                    <AppText variant="overline" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      CODE
                    </AppText>
                    <AppText variant="h3" style={{ color: '#fff', fontSize: 15 }}>
                      {offer.code}
                    </AppText>
                  </View>
                  <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {expiryLabel(offer.expires)}
                  </AppText>
                </View>
              </View>
            </GradientSurface>
            <View style={{ marginTop: 10 }}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Use offer ${offer.code}`}
                onPress={() => applyOffer(offer)}
                style={{
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: theme.radius.pill,
                  paddingVertical: 13,
                  alignItems: 'center',
                }}
              >
                <AppText variant="button" color="primary">
                  Use this offer
                </AppText>
              </PressableScale>
            </View>
          </View>
        ))}

        <AppText variant="caption" color="textMuted" center style={{ marginTop: 4, paddingHorizontal: 24 }}>
          Coupons are validated by our server at checkout — the discount you see there is the one that applies.
        </AppText>

        <Button label="Start an order" variant="ghost" onPress={() => tabNav.navigate('Home')} />
      </ScrollView>
    </Screen>
  );
}
