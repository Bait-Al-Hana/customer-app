/**
 * Places autocomplete port (spec §4, §19-A).
 *
 * Same discipline as the routing provider on the backend: one interface,
 * gateway-neutral types, one adapter chosen at boot. The whole point is to
 * make Places API cost a controlled surface — a session token is generated
 * per autocomplete session and reused across every request until the user
 * selects a result, so the whole session bills as a single billable event
 * under Google's Autocomplete-with-Details pricing. No adapter here calls
 * Google today; that live adapter (`GoogleWebPlacesProvider`) is a stub the
 * same way `TapPaymentGateway` and `GoogleRoutingProvider` are — never invent
 * a provider's API.
 *
 * `MockPlacesProvider` powers the demo: a small in-repo list of common
 * districts, filtered locally, so address search works end-to-end without a
 * paid key.
 */

export interface PlaceSuggestion {
  /** Provider-specific id used to fetch details in the same session. */
  placeId: string;
  primaryText: string;
  secondaryText?: string;
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
}

export interface PlacesProvider {
  autocomplete(query: string, sessionToken: string): Promise<PlaceSuggestion[]>;
  details(placeId: string, sessionToken: string): Promise<PlaceDetails | null>;
  /** Which adapter produced these — `"mock"` for the sandbox. */
  readonly name: string;
}

/**
 * A tiny in-memory sample for the demo. Deliberately small: it is not a
 * geodatabase, it is a stand-in that makes address search demoable without
 * turning on billing. Real coverage is a Google Places job, and its adapter
 * lives elsewhere.
 */
const SAMPLE_PLACES: (PlaceDetails & { primaryText: string; secondaryText: string })[] = [
  {
    placeId: 'mock-olaya',
    primaryText: 'Olaya, Riyadh',
    secondaryText: 'Riyadh, Saudi Arabia',
    formattedAddress: 'Olaya, Riyadh, Saudi Arabia',
    latitude: 24.6941,
    longitude: 46.6837,
    city: 'Riyadh',
    district: 'Olaya',
  },
  {
    placeId: 'mock-al-malaz',
    primaryText: 'Al Malaz, Riyadh',
    secondaryText: 'Riyadh, Saudi Arabia',
    formattedAddress: 'Al Malaz, Riyadh, Saudi Arabia',
    latitude: 24.6673,
    longitude: 46.7355,
    city: 'Riyadh',
    district: 'Al Malaz',
  },
  {
    placeId: 'mock-al-nakheel',
    primaryText: 'Al Nakheel, Riyadh',
    secondaryText: 'Riyadh, Saudi Arabia',
    formattedAddress: 'Al Nakheel, Riyadh, Saudi Arabia',
    latitude: 24.7728,
    longitude: 46.6402,
    city: 'Riyadh',
    district: 'Al Nakheel',
  },
  {
    placeId: 'mock-hittin',
    primaryText: 'Hittin, Riyadh',
    secondaryText: 'Riyadh, Saudi Arabia',
    formattedAddress: 'Hittin, Riyadh, Saudi Arabia',
    latitude: 24.7647,
    longitude: 46.6136,
    city: 'Riyadh',
    district: 'Hittin',
  },
  {
    placeId: 'mock-diplomatic',
    primaryText: 'Diplomatic Quarter, Riyadh',
    secondaryText: 'Riyadh, Saudi Arabia',
    formattedAddress: 'Diplomatic Quarter, Riyadh, Saudi Arabia',
    latitude: 24.6772,
    longitude: 46.6216,
    city: 'Riyadh',
    district: 'Diplomatic Quarter',
  },
];

export class MockPlacesProvider implements PlacesProvider {
  readonly name = 'mock';

  async autocomplete(query: string, _sessionToken: string): Promise<PlaceSuggestion[]> {
    void _sessionToken;
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return SAMPLE_PLACES.filter((p) => p.primaryText.toLowerCase().includes(q))
      .slice(0, 5)
      .map(({ placeId, primaryText, secondaryText }) => ({ placeId, primaryText, secondaryText }));
  }

  async details(placeId: string, _sessionToken: string): Promise<PlaceDetails | null> {
    void _sessionToken;
    return SAMPLE_PLACES.find((p) => p.placeId === placeId) ?? null;
  }
}

/**
 * A stable session id used across every autocomplete request until the user
 * either picks a result or gives up. Google bills the whole session as one
 * event when the token is reused, so this is the cost lever — regenerate
 * only after a successful `details()` or when the user cancels/closes the
 * search UI. Not a security token; just an id.
 */
export function newSessionToken(): string {
  // Enough entropy for uniqueness in the intended lifetime (seconds), and
  // dependency-free so the pure test config can exercise it.
  const rand = Math.random().toString(36).slice(2, 10);
  return `sess-${Date.now().toString(36)}-${rand}`;
}
