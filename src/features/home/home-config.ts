import type { Banner, CustomerConfig, HomepageSection } from '../../api/types';

/**
 * Reading the owner's home-screen configuration — pure, so it is unit-tested.
 *
 * `/customer/config` carries the banners plus the owner's ordered list of
 * homepage sections. Only the sections whose content that endpoint actually
 * serves can be rendered: **banners**. The other kinds (FEATURED, BESTSELLERS,
 * CATEGORIES…) name a section but carry no products, so rendering them would
 * mean inventing what they contain. They are deliberately left alone until the
 * backend serves their contents.
 */

/** The section that governs the banner strip, if the owner has one. */
export function bannerSection(config: CustomerConfig | null): HomepageSection | null {
  return config?.homepageSections.find((s) => s.kind === 'BANNERS') ?? null;
}

/**
 * The banners to show, honouring the owner's configuration.
 *
 * Returns none when a BANNERS section exists and is disabled — turning the
 * section off in the admin app has to actually turn it off. When no section
 * row exists at all the banners still show: a fresh install has banners and no
 * section list, and hiding them then would look like the feature was broken.
 */
export function visibleBanners(config: CustomerConfig | null): Banner[] {
  if (!config) {
    return [];
  }
  const section = bannerSection(config);
  if (section && !section.enabled) {
    return [];
  }
  return config.banners;
}

/** The heading over the banner strip, falling back to nothing rather than a guess. */
export function bannerTitle(config: CustomerConfig | null): string | null {
  return bannerSection(config)?.title ?? null;
}
