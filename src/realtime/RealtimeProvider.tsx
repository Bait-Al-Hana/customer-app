import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { API_BASE_URL } from '../api/config';
import { useAuth } from '../auth/AuthProvider';

/**
 * The server events a customer's socket can receive.
 *
 * A customer joins exactly one room — their own — so this only ever carries
 * their own orders. Nothing branch-facing or driver-facing reaches this app.
 */
export type RealtimeEvent = 'order.transitioned';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

/** What the backend sends with `order.transitioned` (see its `realtime.service.ts`). */
export interface OrderEvent {
  orderId?: string;
  status?: string;
}

type Handler = (payload: OrderEvent) => void;

interface RealtimeContextValue {
  status: ConnectionStatus;
  /** Subscribe to one server event. Returns an unsubscribe function. */
  subscribe: (event: RealtimeEvent, handler: Handler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/** The API base is `<origin>/api/v1`; the socket lives at `<origin>` path `/realtime`. */
function socketOrigin(): string {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
}

/**
 * One authenticated socket for the signed-in customer.
 *
 * **The tracking screen is why this exists.** It polls every eight seconds,
 * which is fine for "preparing" and wrong for the two moments a customer is
 * actually watching the screen: the branch accepting the order, and a driver
 * being assigned to it. The backend has emitted `order.transitioned` into a
 * per-customer room since the realtime layer was built (`ROOMS.customer`); the
 * admin panel and the POS were its only clients. This is the customer one.
 *
 * **The poll stays.** This is an accelerator, not a replacement — the same call
 * the POS board makes. A phone on a patchy connection must still advance the
 * screen, and `useRealtimeReload` fires once on every (re)connect so a status
 * that changed while the socket was down is picked up as soon as it returns.
 *
 * Emission is one-directional: this app only listens. Placing, paying and
 * cancelling all still go through the REST endpoints.
 *
 * Kept deliberately close to the POS and driver providers so the clients behave
 * the same. The difference here is the token store — this app keeps tokens in
 * `deviceStore`, so the token is read through `useAuth().getAccessToken()`
 * rather than off a storage key.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  // Read through a ref so a changed identity of the getter cannot tear the
  // socket down and reconnect it mid-order.
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    const socket = io(socketOrigin(), {
      path: '/realtime',
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: tokenRef.current() ?? '' }),
    });
    socketRef.current = socket;

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));
    // The server disconnects an unauthorised socket after emitting this.
    socket.on('unauthorized', () => setStatus('disconnected'));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      status,
      subscribe: (event, handler) => {
        const socket = socketRef.current;
        if (!socket) return () => undefined;
        socket.on(event, handler as (payload: unknown) => void);
        return () => {
          socket.off(event, handler as (payload: unknown) => void);
        };
      },
    }),
    // `status` is in the deps so a subscribe made before connect re-binds once
    // the socket exists.
    [status],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/**
 * The socket, or a dead stand-in when there is no provider above.
 *
 * Deliberately does **not** throw. A screen with no realtime still works — it
 * polls, which is the floor this sits on top of — and the alternative is a
 * missing provider turning into a blank screen. The screen tests mount screens
 * without the provider for the same reason.
 */
export function useRealtime(): RealtimeContextValue {
  return (
    useContext(RealtimeContext) ?? { status: 'disconnected', subscribe: () => () => undefined }
  );
}

/**
 * Reloads one order when the server says it moved, and once on every reconnect.
 *
 * Filtered to `orderId` because a customer with two live orders would otherwise
 * refetch the screen they are looking at every time the other one moved. An
 * event with no `orderId` (an older backend) is treated as relevant rather than
 * dropped — a needless refetch is cheaper than a screen that never advances.
 */
export function useOrderUpdates(orderId: string, onChange: () => void): ConnectionStatus {
  const { status, subscribe } = useRealtime();
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    return subscribe('order.transitioned', (payload) => {
      if (!payload?.orderId || payload.orderId === orderId) {
        cb.current();
      }
    });
  }, [subscribe, orderId]);

  useEffect(() => {
    if (status === 'connected') {
      cb.current();
    }
  }, [status]);

  return status;
}
