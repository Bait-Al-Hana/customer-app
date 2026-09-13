import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, useWindowDimensions, View, ViewToken } from 'react-native';
import { useTheme } from '../theme/theme';
import type { Banner } from '../api/types';

const INTERVAL = 8000;
const H_PAD = 16;
const GAP = 12;
/**
 * Banner artwork is wide, so the card is sized by **ratio**, not by a fixed
 * height. At 140pt tall on a 358pt-wide phone a 2:1 image was letterboxed into
 * a strip with grey bars down both sides — the artwork the owner uploaded, shown
 * smaller than the space it was given. 16:9 fills the width on a phone and is
 * close enough to the shape most promo artwork is exported in.
 */
const BANNER_ASPECT = 16 / 9;
/** Beyond a tablet's width a full-bleed banner becomes a wall. */
const MAX_BANNER_WIDTH = 620;

export function BannerCarousel({ banners }: { banners: Banner[] }): React.JSX.Element | null {
  const theme = useTheme();
  // Read at render, not at module load: a fixed `Dimensions.get()` is captured
  // once and is then wrong for the rest of the session on a rotated phone and
  // on every web window that is ever resized.
  const { width } = useWindowDimensions();
  const bannerWidth = Math.min(width, MAX_BANNER_WIDTH) - H_PAD * 2;
  const bannerHeight = Math.round(bannerWidth / BANNER_ASPECT);
  const flatListRef = useRef<FlatList<Banner>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sorted = [...banners].sort((a, b) => a.priority - b.priority);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (sorted.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % sorted.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, INTERVAL);
  }, [sorted.length]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0]?.index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  if (sorted.length === 0) return null;

  return (
    <View style={{ marginTop: 16 }}>
      <FlatList
        ref={flatListRef}
        data={sorted}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        onScrollBeginDrag={() => { if (timerRef.current) clearInterval(timerRef.current); }}
        onScrollEndDrag={() => startTimer()}
        contentContainerStyle={{ paddingHorizontal: H_PAD }}
        snapToInterval={bannerWidth + GAP}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <View
            // A banner is an image and nothing else, so without this it is
            // invisible to a screen reader — and untestable, since there is no
            // text on screen to find it by.
            accessibilityRole="image"
            accessibilityLabel={item.title}
            style={{
              width: bannerWidth,
              height: bannerHeight,
              borderRadius: theme.radius.xl,
              overflow: 'hidden',
              marginRight: GAP,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        )}
      />

      {sorted.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 }}>
          {sorted.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIndex ? theme.colors.primary : theme.colors.border,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
