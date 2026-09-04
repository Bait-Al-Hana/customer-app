import { toAddress } from '../../src/util/geocode';

describe('toAddress', () => {
  it('joins a street number to its street', () => {
    expect(
      toAddress({ streetNumber: '12', street: 'King Fahd Rd', city: 'Riyadh' }),
    ).toEqual({ line1: '12 King Fahd Rd', city: 'Riyadh' });
  });

  it('does not repeat a number the platform already put in the street', () => {
    // Android often returns street: "12 King Fahd Rd" AND streetNumber: "12".
    expect(
      toAddress({ streetNumber: '12', street: '12 King Fahd Rd', city: 'Riyadh' })?.line1,
    ).toBe('12 King Fahd Rd');
  });

  it('falls back to `name` when there is no street', () => {
    expect(toAddress({ name: 'Kingdom Centre', city: 'Riyadh' })?.line1).toBe('Kingdom Centre');
  });

  it('keeps the district, which is often what a driver navigates by here', () => {
    const address = toAddress({ street: 'King Fahd Rd', district: 'Al Olaya', city: 'Riyadh' });

    expect(address?.district).toBe('Al Olaya');
    expect(address?.line1).toBe('King Fahd Rd');
  });

  it('uses the district as the line when there is no street at all', () => {
    // Dropping it because there is no street name would throw away the useful
    // half of what the platform gave us.
    const address = toAddress({ district: 'Al Olaya', city: 'Riyadh' });

    expect(address?.line1).toBe('Al Olaya');
    // Not repeated as both line and district.
    expect(address?.district).toBeUndefined();
  });

  it('falls back through subregion and region for the city', () => {
    expect(toAddress({ street: 'A Rd', subregion: 'Riyadh' })?.city).toBe('Riyadh');
    expect(toAddress({ street: 'A Rd', region: 'Riyadh Province' })?.city).toBe('Riyadh Province');
  });

  it('returns null when there is nothing usable', () => {
    // An address saved as ", , " looks fine in a list and is useless to the
    // person holding the bag. Better to ask the customer to type it.
    expect(toAddress({})).toBeNull();
    expect(toAddress(null)).toBeNull();
    expect(toAddress({ street: '  ', city: '  ' })).toBeNull();
  });

  it('treats whitespace-only fields as absent', () => {
    expect(toAddress({ street: '   ', name: 'Kingdom Centre', city: 'Riyadh' })?.line1).toBe(
      'Kingdom Centre',
    );
  });

  it('carries a postcode when there is one, and omits the key when there is not', () => {
    expect(toAddress({ street: 'A Rd', city: 'Riyadh', postalCode: '12345' })?.postalCode).toBe(
      '12345',
    );
    expect(toAddress({ street: 'A Rd', city: 'Riyadh' })).not.toHaveProperty('postalCode');
  });
});
