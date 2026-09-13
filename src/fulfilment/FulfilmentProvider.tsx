import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { ORDER_TYPE, OrderType } from '../types/backend';
import { getItem, setItem } from '../util/deviceStore';

/**
 * How the customer wants this order — and, for pickup, which branch.
 *
 * It lives above the screens because the answer decides three separate things
 * that must not disagree: which branch the menu comes from, which prices are
 * shown (delivery prices carry the uplift), and what checkout places. Choosing
 * "delivery" on the home screen and then meeting a pickup tab at checkout is
 * how a customer ends up ordering the wrong thing.
 *
 * Owner decision (2026-09-04): **delivery comes from the nearest branch and is
 * not changeable; pickup is the customer's choice.** This provider therefore
 * remembers a *pickup* branch only — the delivery branch is derived from the
 * address every time (`src/util/branchChoice.ts`), so it is always the branch
 * that is actually nearest rather than one remembered from a previous address.
 *
 * Both values persist, because reopening the app to the wrong mode is a small
 * insult that costs a customer their whole basket if they notice late.
 */
const MODE_KEY = 'baitalhana.fulfilmentMode';
const PICKUP_BRANCH_KEY = 'baitalhana.pickupBranchId';

interface FulfilmentContextValue {
  mode: OrderType;
  setMode: (mode: OrderType) => void;
  /** The branch the customer picked for collection, if any. */
  pickupBranchId: string | null;
  setPickupBranchId: (branchId: string | null) => void;
  /** False until the stored choice has been read, so nothing flashes the default. */
  ready: boolean;
}

const FulfilmentContext = createContext<FulfilmentContextValue | null>(null);

function isOrderType(value: string | null): value is OrderType {
  return value === ORDER_TYPE.DELIVERY || value === ORDER_TYPE.PICKUP;
}

export function FulfilmentProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  // Delivery is the default: it is what most customers of a delivery app want,
  // and it is the mode that needs an address, so defaulting to it surfaces the
  // "add your address" prompt while there is still time to act on it.
  const [mode, setModeState] = useState<OrderType>(ORDER_TYPE.DELIVERY);
  const [pickupBranchId, setPickupBranchIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([getItem(MODE_KEY), getItem(PICKUP_BRANCH_KEY)]).then(([storedMode, storedBranch]) => {
      if (!mounted) {
        return;
      }
      if (isOrderType(storedMode)) {
        setModeState(storedMode);
      }
      setPickupBranchIdState(storedBranch);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<FulfilmentContextValue>(
    () => ({
      mode,
      ready,
      pickupBranchId,
      setMode: (next) => {
        setModeState(next);
        void setItem(MODE_KEY, next);
      },
      setPickupBranchId: (branchId) => {
        setPickupBranchIdState(branchId);
        if (branchId) {
          void setItem(PICKUP_BRANCH_KEY, branchId);
        }
      },
    }),
    [mode, pickupBranchId, ready],
  );

  return <FulfilmentContext.Provider value={value}>{children}</FulfilmentContext.Provider>;
}

export function useFulfilment(): FulfilmentContextValue {
  const ctx = useContext(FulfilmentContext);
  if (!ctx) {
    throw new Error('useFulfilment must be used within FulfilmentProvider');
  }
  return ctx;
}
