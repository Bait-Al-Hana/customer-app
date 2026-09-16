import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, Skeleton, Stagger } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';
import { resolveImageUrl } from '../util/imageUrl';
import { formatSar } from '../util/money';
import { Offer } from '../api/types';

function OfferCard({ offer }: { offer: Offer }): React.JSX.Element {
  const theme = useTheme();
  const imageUri = resolveImageUrl(offer.imageUrl);

  const discount =
    offer.discountType === 'PERCENTAGE'
      ? `${offer.discountValue}% off`
      : `${formatSar(offer.discountValue)} off`;

  return (
    <Card>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{
            width: '100%',
            height: 160,
            borderRadius: theme.radius.md,
            marginBottom: 12,
          }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700' }}>
        {offer.name}
      </Text>
      {offer.description ? (
        <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>
          {offer.description}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', marginTop: 8, gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <View
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.pill,
            paddingVertical: 4,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontSize: 13, fontWeight: '700' }}>
            {discount}
          </Text>
        </View>
        {offer.minOrderMinor != null && offer.minOrderMinor > 0 ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
            Min order {formatSar(offer.minOrderMinor)}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          marginTop: 10,
          backgroundColor: theme.colors.background,
          borderRadius: theme.radius.md,
          paddingVertical: 8,
          paddingHorizontal: 12,
          alignSelf: 'flex-start',
        }}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14, letterSpacing: 1 }}>
          {offer.code}
        </Text>
      </View>
    </Card>
  );
}

export function OffersScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Offers'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.customerConfig(), []);
  const offers = data?.offers ?? [];

  return (
    <Screen title="Offers" onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={200} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn't load offers" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : offers.length === 0 ? (
        <EmptyState title="No offers right now" message="Check back soon for deals and discounts." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Stagger>
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </Stagger>
        </ScrollView>
      )}
    </Screen>
  );
}
