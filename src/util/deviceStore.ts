import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * One small key/value store that works on every platform this app ships to.
 *
 * `expo-secure-store` is a **native module**: on the web build every call
 * throws. That is not theoretical — it is why a signed-in customer was signed
 * out every time they closed the tab. Each call site was defensive, so the
 * failure was silent and nothing was ever written.
 *
 * So: Keychain / Keystore on native, `localStorage` on web, and every operation
 * resolves rather than throws — a device that cannot store is a device where
 * the app still works, just without memory. Private-mode browsers throw on
 * `localStorage` access itself, which is why even reading is wrapped.
 *
 * Note what this is *not*: it is not a claim that everything stored here is
 * secret. On web nothing can be — `localStorage` is readable by same-origin
 * script. Tokens live here because a web app has nowhere better; the mitigation
 * is that the refresh token is revocable server-side and signing out revokes
 * the whole family.
 */
const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      return globalThis.localStorage?.getItem(key) ?? null;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Non-fatal: the value simply won't survive a restart.
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore.
  }
}
