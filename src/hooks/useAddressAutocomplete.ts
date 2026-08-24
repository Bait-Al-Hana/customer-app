import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  MockPlacesProvider,
  PlaceDetails,
  PlaceSuggestion,
  PlacesProvider,
  newSessionToken,
} from '../api/places-provider';
import { useDebouncedValue } from './useDebouncedValue';

let sharedProvider: PlacesProvider | null = null;

/** The one provider instance used by every consumer this session. */
function getProvider(): PlacesProvider {
  if (!sharedProvider) sharedProvider = new MockPlacesProvider();
  return sharedProvider;
}

export interface AddressAutocomplete {
  suggestions: PlaceSuggestion[];
  loading: boolean;
  select: (placeId: string) => Promise<PlaceDetails | null>;
  reset: () => void;
}

/**
 * Address autocomplete with session tokens + debouncing.
 *
 * `query` is debounced by 300 ms so a fast typist emits at most one request
 * per pause. A single session token is reused for every request until the
 * user selects a suggestion (via `select`), at which point the token rolls
 * — Google bills the whole session as one event when the token is reused,
 * so this is the cost lever (spec §4, §19-A).
 *
 * The provider is the mock by default, which needs no Places API key at
 * all. Switching to the real Google adapter is a one-line change here once
 * that adapter is implemented.
 */
export function useAddressAutocomplete(query: string): AddressAutocomplete {
  const debounced = useDebouncedValue(query.trim(), 300);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const tokenRef = useRef<string>(newSessionToken());
  const provider = useMemo(() => getProvider(), []);

  useEffect(() => {
    let cancelled = false;
    if (debounced.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    provider
      .autocomplete(debounced, tokenRef.current)
      .then((results) => {
        if (!cancelled) setSuggestions(results);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, provider]);

  const select = useCallback(
    async (placeId: string): Promise<PlaceDetails | null> => {
      const details = await provider.details(placeId, tokenRef.current);
      // A successful details fetch closes the billable session — start fresh
      // so the next autocomplete run does not accidentally chain onto it.
      tokenRef.current = newSessionToken();
      setSuggestions([]);
      return details;
    },
    [provider],
  );

  const reset = useCallback((): void => {
    tokenRef.current = newSessionToken();
    setSuggestions([]);
  }, []);

  return { suggestions, loading, select, reset };
}
