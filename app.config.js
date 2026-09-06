/**
 * Dynamic Expo config.
 *
 * `app.json` holds the static, committable configuration; credentials are
 * injected here from the environment at build time so no key is ever written
 * to a committed file. Mirrors `driver-app/app.config.js`.
 *
 *   GOOGLE_MAPS_API_KEY=... API_BASE_URL=... npx expo start
 *
 * A missing Maps key is not fatal — address and tracking screens degrade to the
 * "map unavailable" card. A missing API URL falls back to the value in
 * `app.json`, which points at the deployed API rather than at localhost: a
 * build that silently talked to `http://localhost:3000` reached nothing at all.
 */
/**
 * The commit this bundle was built from.
 *
 * Vercel sets `VERCEL_GIT_COMMIT_SHA` and GitHub Actions sets `GITHUB_SHA`; a
 * build with neither is a local one and says so. It only ever renders a build
 * marker on the Account screen, so it must never be able to fail a build —
 * hence no shelling out to git and no throwing.
 */
function commitSha() {
  const fromCi = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  return fromCi ? fromCi.slice(0, 7) : 'local';
}

module.exports = ({ config }) => {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
  const apiBaseUrl = process.env.API_BASE_URL ?? config.extra?.apiBaseUrl ?? '';

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: mapsApiKey },
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        ...(mapsApiKey ? { googleMapsApiKey: mapsApiKey } : {}),
      },
    },
    extra: {
      ...config.extra,
      apiBaseUrl,
      googleMapsApiKey: mapsApiKey,
      // Which build this is. Neither is a secret — the commit is public in the
      // repository, and the build time is the fact anyone diagnosing actually
      // wants. See `src/util/buildInfo.ts` for why it exists.
      buildSha: commitSha(),
      builtAt: new Date().toISOString(),
    },
  };
};
