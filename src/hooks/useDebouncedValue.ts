import { useEffect, useState } from 'react';

/**
 * Debounces a rapidly-changing value: returns the latest input only after it
 * has stayed stable for `delayMs`. Used for the Places search box so we do
 * NOT fire an autocomplete request per keystroke (spec §4/§19-A: minimize
 * Places requests, debounce, session-token everything).
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
