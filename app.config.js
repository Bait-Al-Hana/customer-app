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
    extra: { ...config.extra, apiBaseUrl, googleMapsApiKey: mapsApiKey },
  };
};
