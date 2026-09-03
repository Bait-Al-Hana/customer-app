import { bannerTitle, visibleBanners } from '../../src/features/home/home-config';
import type { Banner, CustomerConfig, HomepageSection } from '../../src/api/types';

const banner = (id: string): Banner => ({
  id,
  name: `Banner ${id}`,
  imageUrl: 'https://example.test/b.png',
  title: 'Offer',
  action: 'NONE',
  priority: 0,
});

const section = (over: Partial<HomepageSection> = {}): HomepageSection => ({
  id: 's1',
  kind: 'BANNERS',
  title: 'This week',
  titleAr: null,
  position: 0,
  enabled: true,
  ...over,
});

const config = (over: Partial<CustomerConfig> = {}): CustomerConfig => ({
  version: 1,
  features: {},
  banners: [banner('b1')],
  promotions: [],
  homepageSections: [section()],
  ...over,
});

describe('visibleBanners', () => {
  it('shows the banners when the section is enabled', () => {
    expect(visibleBanners(config()).map((b) => b.id)).toEqual(['b1']);
  });

  it('shows nothing when the owner has turned the section off', () => {
    // Turning a section off in the admin app has to actually turn it off.
    expect(visibleBanners(config({ homepageSections: [section({ enabled: false })] }))).toEqual([]);
  });

  it('still shows banners when no section row exists at all', () => {
    // A fresh install has banners and no section list; hiding them then would
    // look like the feature was broken.
    expect(visibleBanners(config({ homepageSections: [] })).map((b) => b.id)).toEqual(['b1']);
  });

  it('ignores an unrelated section', () => {
    const other = section({ kind: 'FEATURED', enabled: false });
    expect(visibleBanners(config({ homepageSections: [other] })).map((b) => b.id)).toEqual(['b1']);
  });

  it('is empty before the config has loaded', () => {
    expect(visibleBanners(null)).toEqual([]);
  });
});

describe('bannerTitle', () => {
  it('uses the heading the owner set', () => {
    expect(bannerTitle(config())).toBe('This week');
  });

  it('falls back to nothing rather than inventing a heading', () => {
    expect(bannerTitle(config({ homepageSections: [] }))).toBeNull();
    expect(bannerTitle(config({ homepageSections: [section({ title: null })] }))).toBeNull();
    expect(bannerTitle(null)).toBeNull();
  });
});
