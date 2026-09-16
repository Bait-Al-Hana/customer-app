import {
  buildOrderTimeline,
  STATUS_META,
  statusMeta,
} from '../../src/features/order/order-status.model';
import { ORDER_STATUS, ORDER_TYPE, OrderStatus } from '../../src/types/backend';

const ALL_STATUSES = Object.values(ORDER_STATUS) as OrderStatus[];

describe('buildOrderTimeline', () => {
  it('never throws and always returns a valid shape for every status', () => {
    for (const type of [ORDER_TYPE.DELIVERY, ORDER_TYPE.PICKUP]) {
      for (const status of ALL_STATUSES) {
        const t = buildOrderTimeline(status, type);
        expect(t.nodes.length).toBeGreaterThan(0);
        expect(t.progress).toBeGreaterThanOrEqual(0);
        expect(t.progress).toBeLessThanOrEqual(1);
        expect(t.accessibilityLabel.length).toBeGreaterThan(0);
        expect(t.currentLabel.length).toBeGreaterThan(0);
        // At most one node is ever active, and pulse only ever marks the active one.
        expect(t.nodes.filter((n) => n.state === 'active').length).toBeLessThanOrEqual(1);
        for (const node of t.nodes) {
          if (node.pulse) {
            expect(node.state).toBe('active');
          }
        }
      }
    }
  });

  it('marks completed, active and upcoming nodes correctly mid-journey (delivery)', () => {
    const t = buildOrderTimeline(ORDER_STATUS.PREPARING, ORDER_TYPE.DELIVERY);
    expect(t.phase).toBe('in_progress');
    const node = (key: string) => t.nodes.find((n) => n.key === key);
    expect(node('CONFIRMED')).toMatchObject({ state: 'complete' });
    expect(node('PREPARING')).toMatchObject({ state: 'active', pulse: true });
    expect(node('READY')).toMatchObject({ state: 'upcoming' });
    expect(node('DELIVERED')).toMatchObject({ state: 'upcoming' });
    // Exactly one active, exactly one pulsing.
    expect(t.nodes.filter((n) => n.state === 'active')).toHaveLength(1);
    expect(t.nodes.filter((n) => n.pulse)).toHaveLength(1);
  });

  it('completes the whole journey when delivered', () => {
    const t = buildOrderTimeline(ORDER_STATUS.DELIVERED, ORDER_TYPE.DELIVERY);
    expect(t.phase).toBe('completed');
    expect(t.progress).toBe(1);
    expect(t.nodes.every((n) => n.state === 'complete')).toBe(true);
    expect(t.nodes.some((n) => n.pulse)).toBe(false);
  });

  it('uses a shorter, driver-free journey for pickup and relabels delivered', () => {
    const t = buildOrderTimeline(ORDER_STATUS.READY, ORDER_TYPE.PICKUP);
    expect(t.nodes).toHaveLength(4);
    expect(t.nodes.map((n) => n.key)).not.toContain('DRIVER_ASSIGNED');
    const collected = t.nodes.find((n) => n.key === 'DELIVERED');
    expect(collected?.label).toBe('Collected');
    expect(t.nodes.find((n) => n.key === 'READY')?.state).toBe('active');
  });

  it('treats pending payment as pre-journey with no active step', () => {
    const t = buildOrderTimeline(ORDER_STATUS.PENDING_PAYMENT, ORDER_TYPE.DELIVERY);
    expect(t.phase).toBe('awaiting_payment');
    expect(t.progress).toBe(0);
    expect(t.nodes.every((n) => n.state === 'upcoming')).toBe(true);
    expect(t.nodes.some((n) => n.pulse)).toBe(false);
  });

  it('represents cancellation as a distinct, motion-free terminal state', () => {
    const t = buildOrderTimeline(ORDER_STATUS.CANCELLED, ORDER_TYPE.DELIVERY);
    expect(t.phase).toBe('cancelled');
    expect(t.tone).toBe('danger');
    expect(t.progress).toBe(0);
    expect(t.nodes.every((n) => n.state === 'cancelled')).toBe(true);
    expect(t.nodes.some((n) => n.pulse)).toBe(false);
  });

  it('represents a failed payment without starting any step', () => {
    const t = buildOrderTimeline(ORDER_STATUS.PAYMENT_FAILED, ORDER_TYPE.DELIVERY);
    expect(t.phase).toBe('payment_failed');
    expect(t.progress).toBe(0);
    expect(t.nodes.every((n) => n.state === 'upcoming')).toBe(true);
  });

  it('shows refund states as a completed delivery annotated with the refund', () => {
    for (const status of [
      ORDER_STATUS.REFUND_PENDING,
      ORDER_STATUS.PARTIALLY_REFUNDED,
      ORDER_STATUS.REFUNDED,
    ]) {
      const t = buildOrderTimeline(status, ORDER_TYPE.DELIVERY);
      expect(t.phase).toBe('refund');
      expect(t.progress).toBe(1);
      expect(t.nodes.every((n) => n.state === 'complete')).toBe(true);
    }
  });

  it('advances progress monotonically through the delivery journey', () => {
    const journey: OrderStatus[] = [
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY,
      ORDER_STATUS.DRIVER_ASSIGNED,
      ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.OUT_FOR_DELIVERY,
      ORDER_STATUS.DELIVERED,
    ];
    const progresses = journey.map((s) => buildOrderTimeline(s, ORDER_TYPE.DELIVERY).progress);
    for (let i = 1; i < progresses.length; i += 1) {
      expect(progresses[i]).toBeGreaterThan(progresses[i - 1] as number);
    }
    expect(progresses[0]).toBe(0);
    expect(progresses[progresses.length - 1]).toBe(1);
  });

  it('has chip metadata for every backend status', () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_META[status]).toBeDefined();
      expect(STATUS_META[status].label.length).toBeGreaterThan(0);
    }
  });
});

/**
 * Statuses transcribed from the backend's Prisma `OrderStatus` enum.
 *
 * Deliberately a literal list and **not** derived from `ORDER_STATUS`. Every
 * other test in this file iterates the app's own enum, which is exactly why
 * none of them caught `AWAITING_ACCEPTANCE` going missing: a test that walks
 * the client's list can only ever prove the client is consistent with itself.
 * The failure was that the list was short, and the only way to see that is to
 * compare it with something the client does not own.
 *
 * When the backend adds a status, add it here first — this test failing is the
 * intended way to find out.
 */
const BACKEND_ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'AWAITING_ACCEPTANCE',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DRIVER_ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PAYMENT_FAILED',
  'CANCELLED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;

describe('the status list matches the backend', () => {
  it('knows every status the backend can send', () => {
    expect(Object.values(ORDER_STATUS).sort()).toEqual([...BACKEND_ORDER_STATUSES].sort());
  });

  /**
   * AWAITING_ACCEPTANCE named explicitly, because it is the one that shipped
   * broken: only a branch with autoAcceptOrders = false produces it, so every
   * auto-accept branch anyone tested against ran fine.
   */
  it('renders a manual-accept branch’s post-payment status', () => {
    const meta = statusMeta('AWAITING_ACCEPTANCE' as OrderStatus);
    expect(meta.label).toBe('Sent to the branch');
    expect(meta.tone).toBe('progress');

    const timeline = buildOrderTimeline('AWAITING_ACCEPTANCE' as OrderStatus, ORDER_TYPE.DELIVERY);
    expect(timeline.currentLabel).toBe('Sent to the branch');
    // The customer has paid. The screen must not imply otherwise.
    expect(timeline.phase).not.toBe('awaiting_payment');
  });
});

describe('statusMeta', () => {
  it('labels a status this build has never heard of, rather than throwing', () => {
    // What a backend deploy ahead of an app release looks like on a phone that
    // cannot be updated. Indexing STATUS_META directly returned undefined here,
    // and the next property read unmounted the tree.
    const meta = statusMeta('SOME_FUTURE_STATUS' as OrderStatus);
    expect(meta.label).toBe('In progress');
    expect(meta.tone).toBe('progress');
  });

  it('never claims an unknown status is unpaid', () => {
    // The one direction that must not be got wrong: an order the customer has
    // already paid for must never be described as awaiting payment.
    const timeline = buildOrderTimeline('SOME_FUTURE_STATUS' as OrderStatus, ORDER_TYPE.DELIVERY);
    expect(timeline.phase).not.toBe('awaiting_payment');
    expect(timeline.currentLabel.toLowerCase()).not.toContain('payment');
  });
});
