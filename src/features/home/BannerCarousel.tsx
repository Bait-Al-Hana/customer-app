import React from 'react';
import { Image, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import type { Banner } from '../../api/types';
import { PressableScale } from '../../motion';
import { useTheme } from '../../theme/theme';

/**
 * The owner's banners, on the home screen.
 *
 * These are configured in the admin app — image, title, copy, a call to action
 * and a priority — and until now nothing rendered them, so the whole banner
 * feature was configuration with no effect.
 *
 * Ordered by the priority the owner set. A banner whose image fails to load
 * still shows its title and copy over the brand colour rather than collapsing
 * to an empty box, because the image is remote and a demo should not hinge on
 * one URL resolving.
 */
export function BannerCarousel({
  banners,
  onPress,
}: {
  banners: Banner[];
  onPress?: (banner: Banner) => void;
}): React.JSX.Element | null {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  if (banners.length === 0) {
    return null;
  }

  const cardWidth = Math.min(width - 40, 420);
  const ordered = [...banners].sort((a, b) => b.priority - a.priority);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + 12}
      decelerationRate="fast"
      contentContainerStyle={{ gap: 12, paddingRight: 8 }}
    >
      {ordered.map((banner) => (
        <PressableScale
          key={banner.id}
          accessibilityRole={onPress ? 'button' : 'image'}
          accessibilityLabel={banner.title}
          onPress={onPress ? () => onPress(banner) : undefined}
        >
          <View
            style={{
              width: cardWidth,
              height: 150,
              borderRadius: theme.radius.lg,
              overflow: 'hidden',
              backgroundColor: theme.colors.primary,
              justifyContent: 'flex-end',
            }}
          >
            {banner.imageUrl ? (
              <Image
                source={{ uri: banner.imageUrl }}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
                resizeMode="cover"
                accessible={false}
              />
            ) : null}
            {/* A scrim, so white copy stays readable over any photograph. */}
            <View
              style={{
                padding: 14,
                backgroundColor: 'rgba(0,0,0,0.42)',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }} numberOfLines={1}>
                {banner.title}
              </Text>
              {banner.description ? (
                <Text style={{ color: '#F2EDF1', fontSize: 13, marginTop: 2 }} numberOfLines={2}>
                  {banner.description}
                </Text>
              ) : null}
            </View>
          </View>
        </PressableScale>
      ))}
    </ScrollView>
  );
}
