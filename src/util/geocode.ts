/**
 * Turning a reverse-geocode result into an address we can save.
 *
 * `expo-location` returns a loosely-typed bag whose fields are populated
 * differently by platform and by country — on Android `street` is often the
 * whole line while `name` is a house number, and in Saudi Arabia `district` is
 * frequently the only part a driver actually navigates by. Every field can be
 * null.
 *
 * Pure, so the flattening is testable against the shapes the platforms really
 * return. The failure this guards is quiet: an address saved as ", , " looks
 * fine in a list and is useless to the person holding the bag.
 */

/** The subset of `expo-location`'s LocationGeocodedAddress we read. */
export interface ReverseGeocoded {
  name?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  district?: string | null;
  subregion?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
}

export interface GeocodedAddress {
  line1: string;
  district?: string;
  city: string;
  postalCode?: string;
}

const clean = (value: string | null | undefined): string => (value ?? '').trim();

/**
 * Best-effort street line, city and district from a reverse geocode.
 *
 * Returns null when there is nothing usable at all, so the caller asks the
 * customer to type it rather than saving an empty address that will strand a
 * driver. A pin without a readable address is still a pin — the coordinates go
 * with it either way, and the driver navigates by those.
 */
export function toAddress(
  result: ReverseGeocoded | null | undefined,
  fallbackCity = 'Riyadh',
): GeocodedAddress | null {
  if (!result) {
    return null;
  }

  const number = clean(result.streetNumber);
  const street = clean(result.street) || clean(result.name);

  // "12 King Fahd Rd", but never "12" on its own and never a duplicated number
  // when the platform already put it inside `street`.
  const line1 =
    number && street && !street.startsWith(number) ? `${number} ${street}` : street || number;

  const city = clean(result.city) || clean(result.subregion) || clean(result.region);
  const district = clean(result.district);

  // A district with no street is still worth saving — in much of Saudi Arabia
  // it is the part a driver navigates by, and dropping it because there is no
  // street name would throw away the useful half.
  const resolvedLine1 = line1 || district;

  if (!resolvedLine1 && !city) {
    return null;
  }

  return {
    line1: resolvedLine1 || (city || fallbackCity),
    ...(district && district !== resolvedLine1 ? { district } : {}),
    city: city || fallbackCity,
    ...(clean(result.postalCode) ? { postalCode: clean(result.postalCode) } : {}),
  };
}
