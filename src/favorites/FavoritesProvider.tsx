import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { FoodCardData } from '../components/cards';

/**
 * In-memory favourites.
 *
 * Holds the full display payload for each favourited item (not just an id) so
 * the Favourites screen can render immediately without re-fetching a menu. Kept
 * deliberately simple and swappable: a future version can persist this to the
 * secure store or sync it to a backend endpoint behind the same hook, and no
 * screen would change. Favourites are a frontend convenience, never a business
 * rule.
 */
interface FavoritesContextValue {
  ids: Set<string>;
  items: FoodCardData[];
  isFavorite: (id: string) => boolean;
  toggle: (item: FoodCardData) => void;
  remove: (id: string) => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [items, setItems] = useState<FoodCardData[]>([]);

  const toggle = useCallback((item: FoodCardData) => {
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [item, ...prev]));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const value = useMemo<FavoritesContextValue>(() => {
    const ids = new Set(items.map((i) => i.id));
    return {
      ids,
      items,
      isFavorite: (id: string) => ids.has(id),
      toggle,
      remove,
      count: items.length,
    };
  }, [items, toggle, remove]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}
