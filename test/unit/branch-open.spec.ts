import { branchOpenLabel, BranchOpenView } from '../../src/features/branches/branch-open';

const base: BranchOpenView = {
  isAcceptingOrders: true,
  isOpenNow: true,
  opensAt: null,
  closedNote: null,
};

describe('branchOpenLabel', () => {
  it('is open only when accepting AND on-schedule-open', () => {
    const r = branchOpenLabel(base);
    expect(r.canOrder).toBe(true);
    expect(r.tone).toBe('open');
  });

  it('a manual pause never borrows the schedule’s opening time', () => {
    const r = branchOpenLabel({ ...base, isAcceptingOrders: false, isOpenNow: true, opensAt: '17:00' });
    expect(r.canOrder).toBe(false);
    expect(r.tone).toBe('paused');
    expect(r.text).toBe('Not accepting orders right now');
    expect(r.text).not.toContain('17:00');
  });

  it('schedule-closed shows the opening time when known', () => {
    const r = branchOpenLabel({ ...base, isOpenNow: false, opensAt: '09:00' });
    expect(r.canOrder).toBe(false);
    expect(r.tone).toBe('closed');
    expect(r.text).toBe('Closed · opens at 09:00');
  });

  it('prefers the owner’s note over the opening time', () => {
    const r = branchOpenLabel({ ...base, isOpenNow: false, opensAt: '09:00', closedNote: 'Eid holiday' });
    expect(r.text).toBe('Closed · Eid holiday');
  });

  it('falls back to a bare closed when nothing is known', () => {
    expect(branchOpenLabel({ ...base, isOpenNow: false }).text).toBe('Closed now');
  });
});
