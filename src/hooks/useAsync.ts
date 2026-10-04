import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../api/http';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  /** Re-fetch, showing the loading state (skeletons) and surfacing a failure. */
  reload: () => void;
  /**
   * Re-fetch in the background: keep the current data on screen (no skeleton
   * flash) and, if the refetch fails, leave that data in place rather than
   * replacing a working screen with an error. This is what a focus or
   * pull-to-refresh wants — the screen already has something to show, and the
   * point is only to catch it up, not to blank it.
   */
  refresh: () => void;
}

/**
 * Runs an async fetch and tracks loading/error/data, with `reload`/`refresh`.
 *
 * The loading flag drives skeletons; the error drives the error state. Both are
 * first-class so every data screen has a real empty/loading/error path rather
 * than a blank flash. Safe against unmount (no state set after teardown).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [nonce, setNonce] = useState(0);
  // Marks the pending run as a background refresh, so the effect knows not to
  // blank the screen or surface a failure for it. A ref, because it must be
  // read inside the effect without being a dependency that retriggers it.
  const quietNext = useRef(false);

  const reload = useCallback(() => {
    quietNext.current = false;
    setNonce((n) => n + 1);
  }, []);
  const refresh = useCallback(() => {
    quietNext.current = true;
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    const quiet = quietNext.current;
    quietNext.current = false;
    if (!quiet) {
      setLoading(true);
      setError(null);
    }
    fn()
      .then((result) => {
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          // A background refresh that fails leaves the current data in place.
          if (!quiet) {
            setError(err instanceof ApiError ? err : new ApiError({ statusCode: 0, code: 'UNKNOWN', message: 'Something went wrong.' }));
          }
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, reload, refresh };
}
