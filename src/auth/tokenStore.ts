import { AuthTokens } from '../api/types';
import { getItem, removeItem, setItem } from '../util/deviceStore';

/**
 * Persists auth tokens so a signed-in customer stays signed in.
 *
 * The store underneath is `deviceStore` — Keychain / Keystore on native,
 * `localStorage` on web. That distinction is the whole of why a customer used
 * to be signed out every time they closed the app on the web build:
 * `expo-secure-store` is a native module, every call on web threw, and because
 * each one was defensively wrapped the failure was completely silent. Nothing
 * was ever written, so nothing was ever restored.
 *
 * Sessions are long-lived on purpose: the refresh token is good for 30 days and
 * the app exchanges it automatically on the first 401, so a returning customer
 * lands on the menu rather than on the phone-number screen. Signing out is the
 * only thing that ends it, and it revokes the family server-side rather than
 * merely forgetting it here.
 */
const ACCESS_KEY = 'baitalhana.accessToken';
const REFRESH_KEY = 'baitalhana.refreshToken';

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await setItem(ACCESS_KEY, tokens.accessToken);
  await setItem(REFRESH_KEY, tokens.refreshToken);
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const accessToken = await getItem(ACCESS_KEY);
  const refreshToken = await getItem(REFRESH_KEY);

  if (accessToken && refreshToken) {
    return { accessToken, refreshToken };
  }
  return null;
}

export async function clearTokens(): Promise<void> {
  await removeItem(ACCESS_KEY);
  await removeItem(REFRESH_KEY);
}
