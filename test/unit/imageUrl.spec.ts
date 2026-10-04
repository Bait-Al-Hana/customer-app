import { resolveImageUrl } from '../../src/util/imageUrl';

const BASE = 'https://api.example.test/api/v1';

describe('resolveImageUrl', () => {
  it('resolves an uploaded asset path against the API base', () => {
    // Uploaded images are stored as a relative /assets/<id> path; this is the
    // resolution that makes them load instead of falling back to a placeholder.
    expect(resolveImageUrl('/assets/abc', BASE)).toBe(
      'https://api.example.test/api/v1/assets/abc',
    );
  });

  it('leaves an absolute URL alone', () => {
    // Legacy pasted URLs address themselves; prefixing them would break them.
    expect(resolveImageUrl('https://cdn.example.com/a.jpg', BASE)).toBe(
      'https://cdn.example.com/a.jpg',
    );
    expect(resolveImageUrl('//cdn.example.com/a.jpg', BASE)).toBe('//cdn.example.com/a.jpg');
    expect(resolveImageUrl('data:image/png;base64,AAA', BASE)).toBe('data:image/png;base64,AAA');
  });

  it('returns null for nothing, so a caller shows its placeholder', () => {
    expect(resolveImageUrl(null, BASE)).toBeNull();
    expect(resolveImageUrl(undefined, BASE)).toBeNull();
    expect(resolveImageUrl('   ', BASE)).toBeNull();
  });
});
