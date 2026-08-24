import { useEffect, useRef, useState } from 'react';

import { DriverLocationEvent, RealtimeClient } from '../api/realtime';
import { useAuth } from '../auth/AuthProvider';

export interface LiveDriverLocation {
  latitude: number;
  longitude: number;
  at: string;
}

/**
 * Subscribes to the driver's live location for one order, and returns the
 * latest coordinates plus a plain flag for whether the socket is currently
 * receiving. Enabled only while the caller says so — a delivered order stops
 * subscribing so the driver's position is not held on-screen forever, which
 * matches the backend's rule that emits stop once the delivery closes out
 * (spec §12: "Live location access ends" after DELIVERED).
 *
 * The event scope is enforced on the backend: only the order's own customer
 * ever joins `customer:<own id>`, and the backend never emits `driver.location`
 * with a stranger's `customerId`. Filtering here by `orderId` is a
 * defence-in-depth belt, not the authorization boundary.
 */
export function useDriverLocation(
  orderId: string | null,
  enabled: boolean,
): LiveDriverLocation | null {
  const { getAccessToken } = useAuth();
  const [location, setLocation] = useState<LiveDriverLocation | null>(null);
  const clientRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    if (!enabled || !orderId) {
      return;
    }
    const token = getAccessToken();
    if (!token) {
      return;
    }

    const client = new RealtimeClient();
    clientRef.current = client;
    client.connect(token);

    const unsubscribe = client.onDriverLocation((event: DriverLocationEvent) => {
      if (event.orderId !== orderId) return;
      setLocation({ latitude: event.latitude, longitude: event.longitude, at: event.at });
    });

    return () => {
      unsubscribe();
      client.disconnect();
      clientRef.current = null;
    };
  }, [orderId, enabled, getAccessToken]);

  // Reset when the order changes so a stale marker never crosses screens.
  useEffect(() => setLocation(null), [orderId]);

  return location;
}
