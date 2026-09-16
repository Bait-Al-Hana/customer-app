import { API_BASE_URL } from '../api/config';
import { joinUrl } from '../api/http';

/**
 * Turns a stored `imageUrl` value into a loadable URI.
 *
 * Uploaded images are stored as paths (`/assets/<id>`); legacy values are
 * absolute URLs. Same logic as admin-app's `resolveImageUrl`.
 */
export function resolveImageUrl(stored: string | null | undefined): string | null {
  const value = stored?.trim();
  if (!value) {
    return null;
  }
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }
  return joinUrl(API_BASE_URL, value);
}
