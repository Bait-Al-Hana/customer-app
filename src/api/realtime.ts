import { Socket, io } from 'socket.io-client';

import { API_BASE_URL } from './config';
import { realtimeOriginFrom } from './realtime-origin';

export { realtimeOriginFrom };

/**
 * Payload of the backend's `driver.location` event (see backend
 * `realtime.service.ts`). Kept as a self-contained type so this module has
 * one job: transport. The tracking hook consumes it and does not depend on
 * the wider `api/types.ts` shape.
 */
export interface DriverLocationEvent {
  driverId: string;
  branchId: string;
  orderId: string;
  deliveryId: string;
  customerId?: string;
  latitude: number;
  longitude: number;
  at: string;
}

const REALTIME_EVENTS = {
  driverLocation: 'driver.location',
  orderTransitioned: 'order.transitioned',
} as const;

/**
 * Thin realtime client, deliberately narrow: connect authenticated, subscribe
 * to `driver.location`, expose a disconnect. The whole customer app needs no
 * more than this — the tracking screen is the only realtime consumer today,
 * and it does not write over the socket (there are no `emit` calls). Order
 * status transitions still arrive over polling; a later phase can pick them
 * up here for free by wiring `order.transitioned` the same way.
 */
export class RealtimeClient {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket) return;
    this.socket = io(realtimeOriginFrom(API_BASE_URL), {
      path: '/realtime',
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
    });
  }

  onDriverLocation(cb: (event: DriverLocationEvent) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (event: DriverLocationEvent): void => cb(event);
    this.socket.on(REALTIME_EVENTS.driverLocation, handler);
    return () => {
      this.socket?.off(REALTIME_EVENTS.driverLocation, handler);
    };
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
