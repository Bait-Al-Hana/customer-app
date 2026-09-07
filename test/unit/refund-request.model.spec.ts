import type { RefundEligibility, RefundRequest } from '../../src/api/types';
import {
  latestRequest,
  refundPanel,
  summarise,
} from '../../src/features/refund/refund-request.model';

function eligibility(overrides: Partial<RefundEligibility> = {}): RefundEligibility {
  return {
    canRequest: true,
    type: 'CANCELLATION',
    canSelfCancel: false,
    blocker: null,
    message: 'The kitchen has already started this order.',
    windowClosesAt: null,
    ...overrides,
  };
}

function request(overrides: Partial<RefundRequest> = {}): RefundRequest {
  return {
    id: 'rr1',
    orderId: 'o1',
    type: 'CANCELLATION',
    status: 'PENDING',
    reason: 'Ordered the wrong branch',
    resolutionNote: null,
    reviewedAt: null,
    refundId: null,
    orderCancelled: false,
    createdAt: '2026-09-07T10:00:00.000Z',
    ...overrides,
  };
}

describe('refundPanel', () => {
  it('offers an outright cancel while the order engine still allows one', () => {
    const panel = refundPanel(eligibility({ canSelfCancel: true, canRequest: false }), []);

    expect(panel.action).toEqual({ kind: 'cancel', label: 'Cancel order' });
  });

  it('offers a request, labelled by what it would actually be', () => {
    expect(refundPanel(eligibility({ type: 'CANCELLATION' }), []).action.label).toBe(
      'Ask to cancel this order',
    );
    expect(refundPanel(eligibility({ type: 'REFUND' }), []).action.label).toBe('Ask for a refund');
  });

  it('stays quiet when there is nothing to refund and nothing was asked', () => {
    // A "nothing left to refund" line under every past order is noise, and a
    // screen that nags about refunds is a screen that suggests them.
    const panel = refundPanel(
      eligibility({ canRequest: false, type: null, blocker: 'NOTHING_TO_REFUND' }),
      [],
    );

    expect(panel.visible).toBe(false);
  });

  it('still shows a decided request on an order that can no longer be refunded', () => {
    const panel = refundPanel(
      eligibility({ canRequest: false, type: null, blocker: 'NOTHING_TO_REFUND' }),
      [request({ status: 'REJECTED', resolutionNote: 'Outside our policy.' })],
    );

    expect(panel.visible).toBe(true);
    expect(panel.summary?.body).toBe('Outside our policy.');
  });

  it('does not repeat the blocker when the open request already says it', () => {
    const panel = refundPanel(
      eligibility({ canRequest: false, type: null, blocker: 'ALREADY_OPEN' }),
      [request()],
    );

    expect(panel.note).toBeNull();
    expect(panel.summary?.canWithdraw).toBe(true);
  });

  it('shows a raised request even when eligibility could not be loaded', () => {
    // The answer to "what happened to my complaint" must not depend on a second
    // request succeeding.
    const panel = refundPanel(null, [request()]);

    expect(panel.visible).toBe(true);
    expect(panel.summary?.title).toBe('We’re looking at this');
    expect(panel.action.kind).toBe('none');
  });

  it('says nothing at all when eligibility failed and nothing was ever asked', () => {
    expect(refundPanel(null, []).visible).toBe(false);
  });
});

describe('summarise', () => {
  it('never calls an approved refund "refunded"', () => {
    // The money has not arrived. A customer told it had, who then looks at
    // their statement, rings the branch.
    const summary = summarise(request({ status: 'APPROVED', refundId: 'rf1' }));

    expect(summary.body).toMatch(/on its way/i);
    expect(summary.body).toMatch(/few days/i);
    expect(summary.canWithdraw).toBe(false);
  });

  it('says the branch settles in person when no refund was issued', () => {
    // Cash: somebody at the branch owes this. Calling it refunded would close a
    // job nobody has done.
    const summary = summarise(
      request({ status: 'APPROVED', refundId: null, orderCancelled: true }),
    );

    expect(summary.body).toMatch(/cancelled/i);
    expect(summary.body).toMatch(/settle this with you directly/i);
  });

  it('quotes the branch verbatim on a refusal, and copes when there is no note', () => {
    expect(summarise(request({ status: 'REJECTED', resolutionNote: 'The order was correct.' })).body).toBe(
      'The order was correct.',
    );
    expect(summarise(request({ status: 'REJECTED' })).body).toMatch(/couldn’t approve/i);
  });

  it('only lets a pending request be withdrawn', () => {
    expect(summarise(request({ status: 'PENDING' })).canWithdraw).toBe(true);
    for (const status of ['APPROVED', 'REJECTED', 'WITHDRAWN'] as const) {
      expect(summarise(request({ status })).canWithdraw).toBe(false);
    }
  });
});

describe('latestRequest', () => {
  it('picks the newest, not the first the server happened to return', () => {
    const older = request({ id: 'old', createdAt: '2026-09-01T00:00:00.000Z' });
    const newer = request({ id: 'new', createdAt: '2026-09-06T00:00:00.000Z' });

    expect(latestRequest([older, newer])?.id).toBe('new');
    expect(latestRequest([newer, older])?.id).toBe('new');
    expect(latestRequest([])).toBeNull();
  });
});
