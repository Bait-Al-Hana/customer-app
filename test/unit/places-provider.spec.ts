import { MockPlacesProvider, newSessionToken } from '../../src/api/places-provider';

/**
 * The mock provider is what powers the demo, so the two behaviours it must
 * hold are simple: filter locally, and return usable details from the same
 * ids it suggests. `newSessionToken` just has to be non-empty and reasonably
 * unique — the cost lever is that a caller REUSES it, tested at the hook
 * level.
 */
describe('MockPlacesProvider', () => {
  const provider = new MockPlacesProvider();

  it('filters by case-insensitive substring and needs at least 2 characters', async () => {
    expect(await provider.autocomplete('', 'sess')).toHaveLength(0);
    expect(await provider.autocomplete('a', 'sess')).toHaveLength(0);
    const results = await provider.autocomplete('olay', 'sess');
    expect(results.length).toBeGreaterThan(0);
    const first = results[0]!;
    expect(first.primaryText.toLowerCase()).toContain('olaya');
  });

  it('returns details for a placeId returned by autocomplete', async () => {
    const results = await provider.autocomplete('malaz', 'sess');
    const top = results[0]!;
    expect(top).toBeDefined();
    const details = await provider.details(top.placeId, 'sess');
    expect(details).not.toBeNull();
    expect(details?.latitude).toBeGreaterThan(0);
    expect(details?.longitude).toBeGreaterThan(0);
  });

  it('returns null for an unknown placeId', async () => {
    expect(await provider.details('does-not-exist', 'sess')).toBeNull();
  });
});

describe('newSessionToken', () => {
  it('produces distinct tokens on repeated calls', () => {
    const a = newSessionToken();
    const b = newSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(4);
  });
});
