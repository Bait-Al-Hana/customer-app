import React from 'react';
import { Image, StyleProp, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme/theme';

/**
 * A food image that always renders something sensible.
 *
 * The backend menu's `imageUrl` is frequently null, and a broken/empty image is
 * the fastest way to make an app look unfinished. When there is no URL (or it
 * fails to load) this falls back to a soft branded tile with a food glyph, so
 * every card stays visually complete. The glyph is chosen from the product name
 * so the placeholder still hints at the item.
 */
export function FoodImage({
  uri,
  glyph,
  style,
  radius,
  height,
}: {
  uri?: string | null;
  glyph?: string;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  height?: number;
}): React.JSX.Element {
  const theme = useTheme();
  const [failed, setFailed] = React.useState(false);
  const showImage = !!uri && !failed;

  return (
    <View
      style={[
        {
          height,
          borderRadius: radius ?? theme.radius.md,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          resizeMode="cover"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Text style={{ fontSize: (height ?? 96) * 0.42 }}>{glyph ?? '🍽️'}</Text>
      )}
    </View>
  );
}

/** Picks a food emoji from a product/category name — used for image placeholders. */
export function glyphFor(name: string): string {
  const n = name.toLowerCase();
  const map: [string[], string][] = [
    [['burger'], '🍔'],
    [['chicken', 'broast', 'wing'], '🍗'],
    [['shawarma', 'wrap', 'sandwich', 'roll'], '🌯'],
    [['fries', 'fry', 'potato'], '🍟'],
    [['pizza'], '🍕'],
    [['fish', 'seafood', 'shrimp', 'prawn'], '🦐'],
    [['rice', 'kabsa', 'biryani', 'mandi'], '🍛'],
    [['salad', 'fattoush', 'tabbouleh'], '🥗'],
    [['dessert', 'cake', 'sweet', 'kunafa', 'ice'], '🍰'],
    [['juice', 'drink', 'soda', 'cola', 'water', 'tea', 'coffee', 'shake'], '🥤'],
    [['kebab', 'grill', 'bbq', 'meat', 'beef', 'lamb'], '🍖'],
    [['bread', 'bun', 'saj'], '🥙'],
    [['egg', 'breakfast'], '🍳'],
  ];
  for (const [keys, glyph] of map) {
    if (keys.some((k) => n.includes(k))) {
      return glyph;
    }
  }
  return '🍽️';
}
