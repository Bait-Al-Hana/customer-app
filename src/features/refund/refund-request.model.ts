import { REFUND_REQUEST_TYPE } from '../../types/backend';
import type { RefundEligibility, RefundRequest } from '../../api/types';

/**
 * What the order screen should offer about cancelling or getting money back,
 * and what it should say about a request already raised.
 *
 * Pure, and it takes the server's eligibility rather than deriving one: the rule
 * about *when* a customer may ask lives in the backend, and a second copy here
 * is how an app ends up offering a button the server refuses. What this decides
 * is only the wording and which control to show.
 */

export type RefundActionKind =
  /** Cancel it outright, no request, no waiting on anyone. */
  | 'cancel'
  /** Ask the branch, and wait for a decision. */
  | 'request'
  /** Nothing to press. */
  | 'none';

export interface RefundAction {
  kind: RefundActionKind;
  /** Button label. Empty when `kind` is 'none'. */
  label: string;
}

export type RequestTone = 'pending' | 'success' | 'danger' | 'neutral';

export interface RequestSummary {
  title: string;
  body: string;
  tone: RequestTone;
  /** True while the customer can still take it back. */
  canWithdraw: boolean;
}

/** The panel's whole state. */
export interface RefundPanel {
  /** False when there is genuinely nothing to say, so the screen stays quiet. */
  visible: boolean;
  action: RefundAction;
  /** A muted explanation shown under the action, or null. */
  note: string | null;
  summary: RequestSummary | null;
  /**
   * The request `summary` describes. Carried here so a caller acting on it
   * (withdrawing) uses the same one that was summarised, rather than reaching
   * back into the array and picking whichever the server listed first.
   */
  request: RefundRequest | null;
}

const NO_ACTION: RefundAction = { kind: 'none', label: '' };

/** The most recent request for this order, or null. */
export function latestRequest(requests: RefundRequest[]): RefundRequest | null {
  if (requests.length === 0) {
    return null;
  }
  return [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export function summarise(request: RefundRequest): RequestSummary {
  switch (request.status) {
    case 'PENDING':
      return {
        title: 'We’re looking at this',
        body: `You asked ${
          request.type === REFUND_REQUEST_TYPE.CANCELLATION
            ? 'to cancel this order'
            : 'for a refund'
        }: “${request.reason}”. The branch will get back to you.`,
        tone: 'pending',
        canWithdraw: true,
      };
    case 'APPROVED':
      return {
        title: 'Approved',
        body: request.refundId
          ? // Never "refunded" — the money has not arrived yet, and a customer
            // told it had, who then looks at their statement, rings the branch.
            `Your refund is on its way. It can take a few days to appear on your card.${
              request.resolutionNote ? ` ${request.resolutionNote}` : ''
            }`
          : // Approved with nothing refunded online: cash, and somebody at the
            // branch owes it in person. Saying "refunded" would close a job
            // nobody has done.
            `${
              request.orderCancelled ? 'Your order was cancelled. ' : ''
            }The branch will settle this with you directly.${
              request.resolutionNote ? ` ${request.resolutionNote}` : ''
            }`,
        tone: 'success',
        canWithdraw: false,
      };
    case 'REJECTED':
      return {
        title: 'Not approved',
        body:
          // The branch's own words, verbatim. A refusal a customer cannot
          // understand is a phone call.
          request.resolutionNote ?? 'The branch couldn’t approve this request.',
        tone: 'danger',
        canWithdraw: false,
      };
    case 'WITHDRAWN':
      return {
        title: 'You withdrew this',
        body: 'Nothing was cancelled or refunded.',
        tone: 'neutral',
        canWithdraw: false,
      };
  }
}

export function refundPanel(
  eligibility: RefundEligibility | null,
  requests: RefundRequest[],
): RefundPanel {
  const request = latestRequest(requests);
  const summary = request ? summarise(request) : null;

  if (!eligibility) {
    // The eligibility call failed or has not landed. A request already raised is
    // still worth showing — it is the answer to "what happened to my complaint",
    // and hiding it because a second request failed would be the worse silence.
    return { visible: summary !== null, action: NO_ACTION, note: null, summary, request };
  }

  if (eligibility.canSelfCancel) {
    return {
      visible: true,
      action: { kind: 'cancel', label: 'Cancel order' },
      note: null,
      summary,
      request,
    };
  }

  if (eligibility.canRequest) {
    return {
      visible: true,
      action: {
        kind: 'request',
        label:
          eligibility.type === REFUND_REQUEST_TYPE.CANCELLATION
            ? 'Ask to cancel this order'
            : 'Ask for a refund',
      },
      note: eligibility.message,
      summary,
      request,
    };
  }

  // Nothing to press. Say why only when the reason tells the customer something
  // — "there's nothing left to refund" under every past order is noise, and a
  // screen that nags about refunds is a screen that suggests them.
  const worthSaying = eligibility.blocker !== 'NOTHING_TO_REFUND' || summary !== null;

  return {
    visible: worthSaying,
    action: NO_ACTION,
    // A pending request already says everything the ALREADY_OPEN blocker would.
    note: summary && eligibility.blocker === 'ALREADY_OPEN' ? null : eligibility.message,
    summary,
    request,
  };
}
