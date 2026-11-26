import { lerpCoordinate, sameCoordinate } from '../../src/maps/marker-animation';

describe('lerpCoordinate', () => {
  const a = { latitude: 24.0, longitude: 46.0 };
  const b = { latitude: 25.0, longitude: 47.0 };

  it('returns the start at t=0 and the end at t=1', () => {
    expect(lerpCoordinate(a, b, 0)).toEqual(a);
    expect(lerpCoordinate(a, b, 1)).toEqual(b);
  });

  it('interpolates at the midpoint', () => {
    expect(lerpCoordinate(a, b, 0.5)).toEqual({ latitude: 24.5, longitude: 46.5 });
  });

  it('clamps t outside [0,1]', () => {
    expect(lerpCoordinate(a, b, -1)).toEqual(a);
    expect(lerpCoordinate(a, b, 2)).toEqual(b);
  });
});

describe('sameCoordinate', () => {
  it('treats sub-metre differences as the same point', () => {
    expect(sameCoordinate({ latitude: 24.123456, longitude: 46.0 }, { latitude: 24.1234562, longitude: 46.0 })).toBe(true);
  });

  it('distinguishes a real move', () => {
    expect(sameCoordinate({ latitude: 24.0, longitude: 46.0 }, { latitude: 24.001, longitude: 46.0 })).toBe(false);
  });

  it('handles nulls', () => {
    expect(sameCoordinate(null, null)).toBe(true);
    expect(sameCoordinate(null, { latitude: 1, longitude: 1 })).toBe(false);
  });
});
