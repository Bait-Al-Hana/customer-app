import { realtimeOriginFrom } from '../../src/api/realtime-origin';

/**
 * The realtime socket must connect to the backend *origin*, not the REST
 * path. This is easy to get wrong (paths creeping into the socket URL) so a
 * tiny explicit test pins the shape.
 */
describe('realtimeOriginFrom', () => {
  it('strips the REST path off a normal API base URL', () => {
    expect(realtimeOriginFrom('http://localhost:3000/api/v1')).toBe('http://localhost:3000');
    expect(realtimeOriginFrom('https://api.example.com/v1')).toBe('https://api.example.com');
  });

  it('preserves protocol and host when the URL is bare', () => {
    expect(realtimeOriginFrom('https://api.example.com')).toBe('https://api.example.com');
  });

  it('falls back to the raw string when the input is not a URL', () => {
    expect(realtimeOriginFrom('not a url')).toBe('not a url');
  });
});
