import { render } from '@testing-library/react-native';
import React from 'react';

import {
  AddButton,
  AddressCard,
  AppText,
  Badge,
  Button,
  Card,
  CategoryCard,
  Chip,
  FavoriteButton,
  FoodCard,
  FoodListItem,
  GradientSurface,
  PaymentMethodCard,
  PriceRow,
  PromoBanner,
  Rating,
  SearchBar,
  SuccessCheck,
} from '../../src/components';
import { MotionProvider } from '../../src/motion';
import { PAYMENT_METHOD } from '../../src/types/backend';
import type { FoodCardData, PromoBannerData } from '../../src/components';

const wrap = (ui: React.ReactElement) => render(<MotionProvider>{ui}</MotionProvider>);

const food: FoodCardData = {
  id: 'p1',
  name: 'Chicken Shawarma',
  description: 'Grilled chicken, garlic, pickles',
  priceMinor: 1500,
  imageUrl: null,
  rating: 4.6,
  ratingCount: 120,
};

const promo: PromoBannerData = {
  id: 'promo',
  title: '20% off',
  subtitle: 'First order',
  colors: ['#E5178B', '#B01271'],
  glyph: '🌯',
};

describe('app component library (mount)', () => {
  it('mounts text, buttons and price rows', () => {
    expect(() => wrap(<AppText variant="h1">Hello</AppText>)).not.toThrow();
    expect(() => wrap(<Button label="Go" onPress={() => undefined} />)).not.toThrow();
    expect(() => wrap(<Button label="Ghost" variant="ghost" onPress={() => undefined} />)).not.toThrow();
    expect(() => wrap(<Card><AppText>inside</AppText></Card>)).not.toThrow();
    expect(() => wrap(<PriceRow label="Total" value="SAR 42.00" emphasis />)).not.toThrow();
  });

  it('mounts chips, badges, rating and search bar', () => {
    expect(() => wrap(<Chip label="Burgers" selected onPress={() => undefined} />)).not.toThrow();
    expect(() => wrap(<Badge label="New" tone="progress" />)).not.toThrow();
    expect(() => wrap(<Rating value={4.5} count={88} />)).not.toThrow();
    expect(() => wrap(<SearchBar onPress={() => undefined} />)).not.toThrow();
  });

  it('mounts the food/category/promo cards', () => {
    expect(() =>
      wrap(<FoodCard data={food} onPress={() => undefined} onAdd={() => undefined} favorite onToggleFavorite={() => undefined} />),
    ).not.toThrow();
    expect(() =>
      wrap(<FoodListItem data={food} onPress={() => undefined} onAdd={() => undefined} onToggleFavorite={() => undefined} />),
    ).not.toThrow();
    expect(() => wrap(<CategoryCard name="Chicken" glyph="🍗" onPress={() => undefined} />)).not.toThrow();
    expect(() => wrap(<PromoBanner data={promo} onPress={() => undefined} />)).not.toThrow();
  });

  it('mounts order/address/payment cards', () => {
    expect(() =>
      wrap(
        <AddressCard label="Home" line="King Fahd Rd, Riyadh" isDefault selected onPress={() => undefined} />,
      ),
    ).not.toThrow();
    // Every method, because each renders a different mark and two of the old
    // emoji glyphs did not render at all off Apple platforms.
    for (const method of Object.values(PAYMENT_METHOD)) {
      expect(() =>
        wrap(<PaymentMethodCard method={method} label={method} selected onPress={() => undefined} />),
      ).not.toThrow();
    }
  });

  it('mounts the animated feedback controls and success mark', () => {
    expect(() => wrap(<AddButton onPress={() => undefined} />)).not.toThrow();
    expect(() => wrap(<FavoriteButton active onToggle={() => undefined} />)).not.toThrow();
    expect(() => wrap(<SuccessCheck />)).not.toThrow();
    expect(() => wrap(<GradientSurface colors={['#E5178B', '#B01271']}><AppText>x</AppText></GradientSurface>)).not.toThrow();
  });
});
