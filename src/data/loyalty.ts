/**
 * Loyalty mock data — a FRONTEND-ONLY placeholder.
 *
 * The backend has a loyalty ledger (Phase 17), but no customer-app read endpoint
 * is wired here yet. This module supplies a typed, believable snapshot so the
 * loyalty screen is fully designed now; swap it for the real
 * `GET /customer/loyalty` when it exists. The point maths shown here is display
 * only — the backend remains the source of truth for any real balance.
 */

export interface LoyaltyReward {
  id: string;
  title: string;
  description: string;
  cost: number;
  glyph: string;
}

export type LoyaltyEntryKind = 'earn' | 'redeem' | 'adjust';

export interface LoyaltyEntry {
  id: string;
  kind: LoyaltyEntryKind;
  label: string;
  points: number; // signed: positive earn, negative redeem
  date: string;
}

export interface LoyaltySnapshot {
  points: number;
  tier: string;
  /** Points at which the next reward unlocks (for the progress bar). */
  nextRewardAt: number;
  rewards: LoyaltyReward[];
  history: LoyaltyEntry[];
}

export const LOYALTY: LoyaltySnapshot = {
  points: 420,
  tier: 'Gold',
  nextRewardAt: 500,
  rewards: [
    { id: 'r-delivery', title: 'Free delivery', description: 'One free delivery on your next order', cost: 200, glyph: '🛵' },
    { id: 'r-drink', title: 'Free drink', description: 'Any regular fresh juice or soft drink', cost: 300, glyph: '🥤' },
    { id: 'r-wrap', title: 'Free shawarma wrap', description: 'Any classic chicken or beef wrap', cost: 500, glyph: '🌯' },
    { id: 'r-combo', title: 'Combo meal', description: 'Burger, fries and a drink, on us', cost: 800, glyph: '🍔' },
  ],
  history: [
    { id: 'h1', kind: 'earn', label: 'Order ORD-20260814', points: 42, date: '2026-08-14' },
    { id: 'h2', kind: 'earn', label: 'Order ORD-20260809', points: 35, date: '2026-08-09' },
    { id: 'h3', kind: 'redeem', label: 'Redeemed free delivery', points: -200, date: '2026-08-02' },
    { id: 'h4', kind: 'earn', label: 'Order ORD-20260728', points: 58, date: '2026-07-28' },
    { id: 'h5', kind: 'adjust', label: 'Birthday bonus', points: 100, date: '2026-07-20' },
  ],
};
