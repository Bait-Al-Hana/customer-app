import Constants from 'expo-constants';

import { buildLabel } from './util/buildInfo';

export const APP_VERSION = '1.0.0';

interface BuildExtra {
  buildSha?: unknown;
  builtAt?: unknown;
}

/**
 * Defensive: `expoConfig` is null in some runtimes (a bare Metro host, an older
 * Expo Go), and a build marker must never be the thing that stops the Account
 * screen rendering.
 */
function extra(): BuildExtra {
  return (Constants.expoConfig?.extra ?? {}) as BuildExtra;
}

/**
 * Which build this is, injected by `app.config.js` — the same route the API URL
 * and the Maps key take.
 *
 * Nothing here is a secret: the commit is public in the repository, and the
 * build time is the fact anyone diagnosing actually wants. A build made outside
 * CI honestly reports `local`; a local build claiming a commit would be the one
 * lie this marker cannot afford, since its entire job is saying what is really
 * running. See `util/buildInfo.ts` for why it exists.
 */
export const BUILD_SHA: string =
  typeof extra().buildSha === 'string' && extra().buildSha ? (extra().buildSha as string) : 'local';

export const BUILT_AT: string =
  typeof extra().builtAt === 'string' ? (extra().builtAt as string) : '';

/** The marker as it is rendered — "a3f9c21 · today 14:23". */
export function buildMarker(now: Date = new Date()): string {
  return buildLabel(BUILD_SHA, BUILT_AT, now);
}
