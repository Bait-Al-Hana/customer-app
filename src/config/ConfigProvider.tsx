import React, { createContext, useContext, useMemo } from 'react';

export interface AppConfig {
  loyaltyEnabled: boolean;
  couponsEnabled: boolean;
  favouritesEnabled: boolean;
  pushEnabled: boolean;
  scheduledOrdersEnabled: boolean;
  showCalories: boolean;
  showPrepTime: boolean;
  showAllergens: boolean;
  showChargesBreakdown: boolean;
  minAppVersion: string | null;
}

const DEFAULT_CONFIG: AppConfig = {
  loyaltyEnabled: true,
  couponsEnabled: true,
  favouritesEnabled: true,
  pushEnabled: false,
  scheduledOrdersEnabled: false,
  showCalories: true,
  showPrepTime: true,
  showAllergens: true,
  showChargesBreakdown: true,
  minAppVersion: null,
};

const ConfigContext = createContext<AppConfig>(DEFAULT_CONFIG);

export function ConfigProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const config = useMemo(() => DEFAULT_CONFIG, []);
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useConfig(): AppConfig {
  return useContext(ConfigContext);
}
