/**
 * Branch availability for the customer, as one word plus a sentence — pure,
 * no React Native.
 *
 * Two independent facts decide whether a customer can order now, and the UI
 * must not conflate them (the admin panel learned this the hard way):
 *
 *  - `isAcceptingOrders` — a switch someone flips. "Not right now", with no
 *    promise about when. Announcing an opening time for it is a promise nobody
 *    made.
 *  - `isOpenNow` / `opensAt` — the schedule running on its own. It knows when
 *    it opens again, so here an opening time is honest.
 *
 * A branch can order **only when both are true**. Being pure, the three
 * outcomes are unit-tested.
 */

export interface BranchOpenView {
  phone?: string | null;
  isAcceptingOrders: boolean;
  isOpenNow: boolean;
  opensAt: string | null;
  closedNote: string | null;
}

export type OpenTone = 'open' | 'paused' | 'closed';

export interface BranchOpenLabel {
  /** Whether the customer can place an order right now. */
  canOrder: boolean;
  tone: OpenTone;
  text: string;
}

/** Resolves the open/closed label for a branch card. */
export function branchOpenLabel(branch: BranchOpenView): BranchOpenLabel {
  // A manual pause first: it is a deliberate "not now" and carries no opening
  // time, so it must never borrow the schedule's "opens at…".
  if (!branch.isAcceptingOrders) {
    return { canOrder: false, tone: 'paused', text: 'Not accepting orders right now' };
  }

  // On schedule and accepting: open.
  if (branch.isOpenNow) {
    return { canOrder: true, tone: 'open', text: 'Open now' };
  }

  // Closed by schedule. Prefer the owner's note, then the opening time, then a
  // bare "Closed" — each is more useful than the last but none is invented.
  if (branch.closedNote) {
    return { canOrder: false, tone: 'closed', text: `Closed · ${branch.closedNote}` };
  }
  if (branch.opensAt) {
    return { canOrder: false, tone: 'closed', text: `Closed · opens at ${branch.opensAt}` };
  }
  return { canOrder: false, tone: 'closed', text: 'Closed now' };
}
