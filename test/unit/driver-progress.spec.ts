import { driverProgress, freshnessLabel, STALE_AFTER_MS } from '../../src/util/driverProgress';

const NOW = new Date('2026-09-04T12:00:00.000Z').getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

// Riyadh, about 3 km apart.
const HOME = { latitude: 24.7136, longitude: 46.6753 };
const NEARBY = { latitude: 24.7136, longitude: 46.7053 };

describe('driverProgress', () => {
  it('gives the distance and an estimate from a fresh fix', () => {
    const progress = driverProgress({ ...NEARBY, lastLocationAt: ago(10_000) }, HOME, NOW);

    // ~3 km straight line, inflated by the same 1.3 road factor the backend
    // prices delivery with.
    expect(progress.distanceKm).toBeGreaterThan(3.5);
    expect(progress.distanceKm).toBeLessThan(4.5);
    expect(progress.live).toBe(true);
    expect(progress.etaMinutes).toBeGreaterThan(5);
    expect(progress.etaMinutes).toBeLessThan(20);
  });

  it('refuses an ETA when the last fix has gone stale', () => {
    // Pings arrive every 30s while carrying an order, so this is many missed
    // ones: the driver may be at the door or stuck on the ring road. Saying
    // which would be a guess dressed as information.
    const progress = driverProgress(
      { ...NEARBY, lastLocationAt: ago(STALE_AFTER_MS + 60_000) },
      HOME,
      NOW,
    );

    expect(progress.live).toBe(false);
    expect(progress.etaMinutes).toBeNull();
    // The distance is still shown — it is the last thing we actually know.
    expect(progress.distanceKm).not.toBeNull();
    expect(progress.fixAgeMs).toBeGreaterThan(STALE_AFTER_MS);
  });

  it('refuses everything when the driver has never sent a position', () => {
    const progress = driverProgress(null, HOME, NOW);

    expect(progress).toEqual({ distanceKm: null, etaMinutes: null, fixAgeMs: null, live: false });
  });

  it('refuses when the address has no map pin', () => {
    const progress = driverProgress({ ...NEARBY, lastLocationAt: ago(5_000) }, null, NOW);

    expect(progress.distanceKm).toBeNull();
    expect(progress.etaMinutes).toBeNull();
  });

  it('never says nought minutes', () => {
    // A driver 100 m away is still parking, and "0 min" reads as a bug.
    const nextDoor = { latitude: 24.7137, longitude: 46.6754, lastLocationAt: ago(5_000) };

    expect(driverProgress(nextDoor, HOME, NOW).etaMinutes).toBe(1);
  });

  it('treats 0,0 as no position rather than the Atlantic', () => {
    const progress = driverProgress(
      { latitude: 0, longitude: 0, lastLocationAt: ago(5_000) },
      HOME,
      NOW,
    );

    expect(progress.distanceKm).toBeNull();
  });
});

describe('freshnessLabel', () => {
  it('says how old the position on screen is', () => {
    expect(freshnessLabel(5_000)).toBe('updated just now');
    expect(freshnessLabel(60_000)).toBe('updated 1 min ago');
    expect(freshnessLabel(9 * 60_000)).toBe('updated 9 min ago');
    expect(freshnessLabel(3 * 3_600_000)).toBe('updated over an hour ago');
  });

  it('says nothing when there is no fix to date', () => {
    expect(freshnessLabel(null)).toBeNull();
  });
});
