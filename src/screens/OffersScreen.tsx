import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { AppText, Card, Screen } from '../components';
import { BannerCarousel } from '../components/BannerCarousel';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { MainTabParamList } from '../navigation/types';
import type { CustomerConfig, Offer } from '../api/types';
import { useTheme } from '../theme/theme';
import { formatSar } from '../util/money';

/**
 * Offers: the owner's published deals, and the only place banners appear.
 *
 * Two owner decisions (2026-09-04) meet here:
 *
 * - **Every offer is a real coupon.** It is created in the admin panel with its
 *   own artwork, its code and its discount, and this screen shows exactly that.
 *   The screen it replaced listed hard-coded marketing copy with invented codes
 *   — so every code a customer tapped was rejected at checkout, which is worse
 *   than having no offers page at all. Nothing here is computed: tapping an
 *   offer attaches its code, and the backend decides what it is worth.
 * - **Banners live here, not on home.** A customer who wants a deal comes
 *   looking for one; on home the same artwork pushed the food below the fold.
 */
export function OffersScreen(): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const tabNav = useNavigation<BottomTabScreenProps<MainTabParamList>['navigation']>();
  const { count, couponCode, setCouponCode } = useCart();
  const [toast, setToast] = useState<string | null>(null);

  const config = useAsync<CustomerConfig>(() => api.customerConfig(), []);
  const offers = config.data?.offers ?? [];
  const banners = config.data?.banners ?? [];

  const use = (offer: Offer): void => {
    setCouponCode(offer.code);
    if (count === 0) {
      setToast(`${offer.code} saved — add items and it applies at checkout`);
      tabNav.navigate('Home');
    } else {
      setToast(`${offer.code} applied — see it at checkout`);
    }
  };

  return (
    <Screen title="Offers" subtitle="Deals from Bait Al Hana">
      <Toast visible={!!toast} message={toast ?? ''} tone="success" onHide={() => setToast(null)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {banners.length > 0 ? <BannerCarousel banners={banners} /> : null}

        <View style={{ padding: 16, gap: 16 }}>
          {config.loading ? (
            <>
              <Skeleton height={190} radius={theme.radius.xl} />
              <Skeleton height={190} radius={theme.radius.xl} />
            </>
          ) : config.error ? (
            <ErrorState
              title="Couldn’t load offers"
              message={config.error.message}
              actionLabel="Retry"
              onAction={config.reload}
            />
          ) : offers.length === 0 ? (
            <EmptyState
              title="No offers right now"
              message="When Bait Al Hana runs a deal, it shows up here."
            />
          ) : (
            offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                applied={couponCode === offer.code}
                onUse={() => use(offer)}
              />
            ))
          )}

          <AppText variant="caption" color="textMuted" center style={{ marginTop: 4, paddingHorizontal: 24 }}>
            Coupons are checked by our server at checkout — the discount you see there is the one
            that applies.
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

/**
 * One offer: the owner's image, what it gives, and the code to quote.
 *
 * The image is whatever the owner uploaded, so the card has to look right both
 * with and without one — an offer created in a hurry with no artwork still
 * needs to read as an offer rather than as a broken card. Without an image the
 * headline takes the space instead.
 */
function OfferCard({
  offer,
  applied,
  onUse,
}: {
  offer: Offer;
  applied: boolean;
  onUse: () => void;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <Card padded={false} elevated>
      {offer.imageUrl ? (
        <Image
          source={{ uri: offer.imageUrl }}
          style={{
            width: '100%',
            height: 150,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
          }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="h2" style={{ fontSize: offer.imageUrl ? 19 : 22 }}>
              {headline(offer)}
            </AppText>
            <AppText variant="body" color="textMuted" style={{ marginTop: 4 }}>
              {offer.description ?? offer.name}
            </AppText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderRadius: theme.radius.md,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.primarySoft,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <AppText variant="overline" color="textMuted">
              CODE
            </AppText>
            <AppText variant="h3" color="primary" style={{ fontSize: 15 }}>
              {offer.code}
            </AppText>
          </View>
          <AppText variant="caption" color="textMuted" style={{ flex: 1 }} numberOfLines={2}>
            {conditions(offer)}
          </AppText>
        </View>

        <View style={{ marginTop: 14 }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={applied ? `${offer.code} applied` : `Use offer ${offer.code}`}
            onPress={onUse}
          >
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 13,
                borderRadius: theme.radius.pill,
                backgroundColor: applied ? theme.colors.surfaceAlt : theme.colors.primarySoft,
                borderWidth: 1.5,
                borderColor: applied ? theme.colors.border : theme.colors.primarySoft,
              }}
            >
              <AppText variant="button" color={applied ? 'textMuted' : 'primary'}>
                {applied ? 'Applied to your basket' : 'Use this offer'}
              </AppText>
            </View>
          </PressableScale>
        </View>
      </View>
    </Card>
  );
}

/** What the offer gives, said the way the owner set it up. */
function headline(offer: Offer): string {
  if (offer.discountType === 'FREE_DELIVERY') {
    return 'Free delivery';
  }
  if (offer.discountType === 'PERCENTAGE') {
    return `${trimZeroes(offer.discountValue)}% off`;
  }
  return `${formatSar(offer.discountValue)} off`;
}

/**
 * The strings attached, stated on the card.
 *
 * A minimum spend or an end date the customer only meets when the code is
 * refused is the same failure as a fake code: they were shown a deal they could
 * not have.
 */
function conditions(offer: Offer): string {
  const parts: string[] = [];

  if (offer.minSpendMinor !== undefined) {
    parts.push(`On orders over ${formatSar(offer.minSpendMinor)}`);
  }
  if (offer.maxDiscountMinor !== undefined && offer.discountType === 'PERCENTAGE') {
    parts.push(`up to ${formatSar(offer.maxDiscountMinor)}`);
  }
  parts.push(`Ends ${new Date(offer.validUntil).toLocaleDateString()}`);

  return parts.join(' · ');
}

function trimZeroes(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace(/0+$/, '');
}
