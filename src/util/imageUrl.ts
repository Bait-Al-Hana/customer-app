import { joinUrl } from '../api/http';

/**
 * Turns whatever is stored in an `imageUrl` column into something an RN `<Image>`
 * can actually load.
 *
 * There are two kinds of value in that column, and there will be for a long
 * time. Images uploaded through the admin panel are stored as the **path** the
 * backend returns (`/assets/<id>`) — deliberately relative, so the same row
 * resolves against whichever API base the admin panel, this app or a local
 * build is pointed at. A raw relative path does **not** load in a React Native
 * `<Image>` (and on the web build it resolves against this app's own origin,
 * not the API), so an uploaded photo silently falls back to the placeholder
 * glyph — which is exactly "my uploaded menu images don't show". Legacy
 * absolute URLs pasted before uploading existed are passed through untouched.
 *
 * `apiBaseUrl` is passed in rather than imported so this stays a pure function
 * testable under the Node logic suite — importing `api/config` would drag
 * `expo-constants` into a plain ts-jest run. Callers pass `API_BASE_URL`, which
 * already resolves to `.../api/v1`, the same base the `/assets/<id>` route is
 * served under.
 *
 * Returns null for an empty value so a caller shows its placeholder.
 */
export function resolveImageUrl(
  stored: string | null | undefined,
  apiBaseUrl: string,
): string | null {
  const value = stored?.trim();
  if (!value) {
    return null;
  }
  // Absolute, protocol-relative, or already a data URI: it addresses itself.
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }
  return joinUrl(apiBaseUrl, value);
}
