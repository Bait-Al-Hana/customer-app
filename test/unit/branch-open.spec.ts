import { branchAvailability, isOrderable } from '../../src/util/branchOpen';

/**
 * Two different things close a branch and they are not interchangeable: a
 * switch staff flipped, and the schedule running on its own. Only one of them
 * knows when the branch opens again, and that difference is what decides
 * whether a customer waits or goes elsewhere.
 */
describe('branchAvailability', () => {
  it('is open when nothing says otherwise', () => {
    expect(branchAvailability({ isAcceptingOrders: true, isOpenNow: true })).toMatchObject({
      open: true,
    });
  });

  it('treats a missing schedule as no opinion, never as closed', () => {
    // A backend older than opening hours does not send `isOpenNow`. Reading
    // that as shut would close every branch for anyone on an app that had not
    // been updated — and the server is what actually refuses an order anyway.
    expect(isOrderable({ isAcceptingOrders: true })).toBe(true);
    expect(isOrderable({ isAcceptingOrders: true, isOpenNow: undefined })).toBe(true);
  });

  it('says "not taking orders" when staff have paused, without promising a time', () => {
    // Staff pausing orders is not a schedule. Saying "opens at 17:00" here
    // would be a promise nobody made — they may not resume then.
    const state = branchAvailability({
      isAcceptingOrders: false,
      isOpenNow: false,
      opensAt: '17:00',
    });
    expect(state).toMatchObject({ open: false, reason: 'paused' });
    expect(state.label).not.toContain('17:00');
  });

  it('says when a branch outside its hours opens again', () => {
    // "Closed" and "closed, opens at 17:00" are different things to someone
    // deciding whether to wait.
    expect(
      branchAvailability({ isAcceptingOrders: true, isOpenNow: false, opensAt: '17:00' }),
    ).toMatchObject({ open: false, reason: 'hours', label: 'Closed · opens at 17:00' });
  });

  it('leads with the holiday note when there is one', () => {
    // "Closed today — Eid holiday" answers the next question; a bare "closed"
    // invites a phone call to a branch with nobody in it.
    expect(
      branchAvailability({
        isAcceptingOrders: true,
        isOpenNow: false,
        opensAt: '17:00',
        closedNote: 'Eid holiday',
      }).label,
    ).toBe('Closed today — Eid holiday');
  });

  it('still says something useful with no opening time to offer', () => {
    expect(
      branchAvailability({ isAcceptingOrders: true, isOpenNow: false }).label,
    ).toBe('Closed right now');
  });

  it('is not orderable in either kind of closure', () => {
    expect(isOrderable({ isAcceptingOrders: false })).toBe(false);
    expect(isOrderable({ isAcceptingOrders: true, isOpenNow: false })).toBe(false);
  });
});
