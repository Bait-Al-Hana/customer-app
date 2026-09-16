/**
 * Whether a pushed driver position belongs on the screen the customer is
 * looking at.
 *
 * Pure and separate from the hook because it is a *correctness* rule about
 * whose position a person is shown, and that should be checkable without
 * mounting a screen or opening a socket.
 */
export interface DriverPing {
  orderId?: string;
  latitude?: number;
  longitude?: number;
  at?: string;
}

export function acceptDriverPing(ping: DriverPing | null | undefined, orderId: string): boolean {
  if (!ping) {
    return false;
  }

  // **Dropped, not trusted, when the order is missing or different** — the
  // opposite of how the reload hook treats an unlabelled event, and
  // deliberately so. A needless refetch is cheap; a marker in the wrong place
  // is a customer watching a stranger drive around, on the screen they opened
  // to find their own dinner.
  if (ping.orderId !== orderId) {
    return false;
  }

  // Coordinates cross this API as `Decimal` columns and have arrived as
  // strings before now — that is what crashed this very screen once. A ping
  // that is not two real numbers is not a position.
  return typeof ping.latitude === 'number' && typeof ping.longitude === 'number';
}
