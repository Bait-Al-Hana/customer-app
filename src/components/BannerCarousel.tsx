import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, View, ViewToken } from 'react-native';
import { useTheme } from '../theme/theme';
import type { Banner } from '../api/types';

const INTERVAL = 8000;
const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PAD = 16;
const GAP = 12;
const BANNER_WIDTH = SCREEN_WIDTH - H_PAD * 2;
const BANNER_HEIGHT = 140;

export function BannerCarousel({ banners }: { banners: Banner[] }): React.JSX.Element | null {
  const theme = useTheme();
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
        snapToInterval={BANNER_WIDTH + GAP}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <View
            // A banner is an image and nothing else, so without this it is
            // invisible to a screen reader — and untestable, since there is no
            // text on screen to find it by.
            accessibilityRole="image"
            accessibilityLabel={item.title}
            style={{
              width: BANNER_WIDTH,
              height: BANNER_HEIGHT,
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
