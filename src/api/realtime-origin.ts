/**
 * Derives the realtime origin from the REST base URL. Backend mounts the
 * gateway on `/realtime`; the socket connects to the origin (no /api path)
 * and passes the auth token in the handshake, same as staff/driver clients.
 * Split into its own module (no expo-constants) so the pure test config can
 * import it without dragging in the RN toolchain.
 */
export function realtimeOriginFrom(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return apiBaseUrl;
  }
}
