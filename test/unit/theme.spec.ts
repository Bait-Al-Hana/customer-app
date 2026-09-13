import { buildTheme } from '../../src/theme/theme';

/**
 * The theme decisions that are easy to undo by accident.
 */
describe('the light palette', () => {
  const light = buildTheme('light').colors;

  it('is a warm cream ground, not a pink-tinted one', () => {
    // The logo's magenta is the loudest thing on any screen. A background that
    // also leans magenta leaves it nothing to be loud against — which is what
    // the old #FCF7FA did.
    const [r, g, b] = rgb(light.background);

    expect(r).toBeGreaterThanOrEqual(g);
    expect(g).toBeGreaterThan(b);
  });

  it('puts white cards on that ground, so they lift without a heavy shadow', () => {
    expect(light.surface.toUpperCase()).toBe('#FFFFFF');
    expect(light.surface.toUpperCase()).not.toBe(light.background.toUpperCase());
  });

  it('keeps body text well clear of the ground', () => {
    // Not a full contrast implementation — just enough to catch a palette edit
    // that leaves text nearly the colour of the page.
    expect(luminance(light.text)).toBeLessThan(0.2);
    expect(luminance(light.background)).toBeGreaterThan(0.9);
  });
});

describe('the dark palette', () => {
  it('is still buildable, so restoring it is a change and not a rewrite', () => {
    // Pinning the app to light is a product decision, not a deletion. If this
    // ever becomes a user-facing setting again, the palette is here.
    const dark = buildTheme('dark').colors;

    expect(luminance(dark.background)).toBeLessThan(0.2);
    expect(luminance(dark.text)).toBeGreaterThan(0.8);
  });
});

function rgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
