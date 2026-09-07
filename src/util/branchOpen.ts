/**
 * Is this branch taking orders, and if not, what should the customer be told?
 *
 * Two different things close a branch and they are not interchangeable:
 *
 * - **`isAcceptingOrders`** is a switch someone at the branch flipped. It means
 *   "not right now" and carries no promise about when that changes.
 * - **`isOpenNow`** is the schedule running on its own — the whole reason a
 *   schedule exists, so that nobody has to remember to close the shop every
 *   night. It knows when the branch opens again, which is the difference
 *   between a customer waiting and a customer going elsewhere.
 *
 * The backend enforces both at placement. This is the same answer said early:
 * a refusal that arrives on the Pay button has already wasted the visit, which
 * is exactly why the delivery blockers were moved onto the quote.
 *
 * Pure, because the sentence a customer reads is the substance here.
 */

export interface BranchAvailabilityInput {
  isAcceptingOrders: boolean;
  /**
   * Whether the branch is inside its opening hours.
   *
   * **Optional, and `undefined` means "no opinion" — never "closed".** A
   * backend older than the schedule feature does not send it, and reading a
   * missing field as shut would close every branch for anyone running an app
   * that had not been updated. The server is what actually refuses an order;
   * this only decides what the screen says.
   */
  isOpenNow?: boolean;
  /** `"17:00"` — when it opens again, if we know. */
  opensAt?: string | null;
  /** `"Eid holiday"` — why today is different, when a date override closed it. */
  closedNote?: string | null;
}

export type BranchAvailability =
  /** Taking orders. */
  | { open: true; label: string; reason: null }
  /** Shut, with the best sentence we can offer about it. */
  | { open: false; label: string; reason: 'paused' | 'hours' };

export function branchAvailability(branch: BranchAvailabilityInput): BranchAvailability {
  // The manual switch wins the wording. If staff have paused orders, saying
  // "opens at 17:00" would be a promise nobody made — they may not resume then.
  if (!branch.isAcceptingOrders) {
    return { open: false, label: 'Not taking orders right now', reason: 'paused' };
  }

  if (branch.isOpenNow === false) {
    if (branch.closedNote) {
      // "Closed today — Eid holiday" answers the next question. A bare
      // "closed" invites a phone call to a branch with nobody in it.
      return { open: false, label: `Closed today — ${branch.closedNote}`, reason: 'hours' };
    }
    if (branch.opensAt) {
      return { open: false, label: `Closed · opens at ${branch.opensAt}`, reason: 'hours' };
    }
    return { open: false, label: 'Closed right now', reason: 'hours' };
  }

  return { open: true, label: 'Open now', reason: null };
}

/** True when an order placed at this branch would be accepted. */
export function isOrderable(branch: BranchAvailabilityInput): boolean {
  return branchAvailability(branch).open;
}
