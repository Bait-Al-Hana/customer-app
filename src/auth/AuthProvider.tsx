import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { API_BASE_URL } from '../api/config';
import { Api } from '../api/endpoints';
import { ApiClient } from '../api/http';
import { AuthTokens } from '../api/types';
import { clearTokens, loadTokens, saveTokens } from './tokenStore';

interface AuthContextValue {
  api: Api;
  /** True once the stored session has been read (avoids an auth-flash on launch). */
  ready: boolean;
  isAuthenticated: boolean;
  /**
   * True only for a session that started with an OTP sign-in in this launch,
   * not one restored from the secure store.
   *
   * It exists so the app can ask a **newly onboarded** customer for their
   * location once, and never nag a returning one who chose to skip. A flag on
   * disk would be the wrong shape: skipping is a decision about this customer,
   * not about this install.
   */
  justOnboarded: boolean;
  /** Store the tokens returned by OTP verification and mark the session active. */
  signIn: (tokens: AuthTokens) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Clears the device without calling the server.
   *
   * For the one case where there is no session left to revoke: account
   * deletion has already revoked every family server-side, so `signOut()` would
   * present a dead refresh token and surface a failure for something that
   * succeeded.
   */
  forgetSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Owns the auth session and the single `Api` instance.
 *
 * The access token is held in a ref so the HTTP client can read it
 * synchronously on every request; a 401 triggers one refresh using the stored
 * refresh token, and a failed refresh signs the user out cleanly. Tokens are
 * never kept only in React state — they are persisted to the secure store so a
 * session survives a restart.
 */
export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [justOnboarded, setJustOnboarded] = useState(false);
  const tokensRef = useRef<AuthTokens | null>(null);

  const setTokens = async (tokens: AuthTokens | null): Promise<void> => {
    tokensRef.current = tokens;
    setIsAuthenticated(!!tokens);
    if (tokens) {
      await saveTokens(tokens);
    } else {
      await clearTokens();
    }
  };

  const api = useMemo(() => {
    const client = new ApiClient(API_BASE_URL, {
      getAccessToken: () => tokensRef.current?.accessToken ?? null,
      onUnauthorized: async () => {
        const refreshToken = tokensRef.current?.refreshToken;
        if (!refreshToken) {
          return false;
        }
        try {
          const next = await new Api(
            new ApiClient(API_BASE_URL, { getAccessToken: () => null, onUnauthorized: async () => false }),
          ).refresh(refreshToken);
          await setTokens(next);
          return true;
        } catch {
          await setTokens(null);
          return false;
        }
      },
    });
    return new Api(client);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadTokens().then((stored) => {
      if (!mounted) {
        return;
      }
      tokensRef.current = stored;
      setIsAuthenticated(!!stored);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      api,
      ready,
      isAuthenticated,
      justOnboarded,
      signIn: async (tokens) => {
        // Set before the tokens, so the navigator picks the onboarding route
        // in the same render that swaps to the authenticated stack rather than
        // showing the tabs first and jumping.
        setJustOnboarded(true);
        await setTokens(tokens);
      },
      signOut: async () => {
        // Revoke server-side first, then clear locally. Best-effort: a
        // customer tapping Sign out on a dead connection must still end up
        // signed out on the device, so a failed revoke never blocks it.
        const refreshToken = tokensRef.current?.refreshToken;
        if (refreshToken) {
          try {
            await api.logout(refreshToken);
          } catch {
            // Ignored on purpose — see above.
          }
        }
        setJustOnboarded(false);
        await setTokens(null);
      },
      forgetSession: async () => {
        setJustOnboarded(false);
        await setTokens(null);
      },
    }),
    [api, ready, isAuthenticated, justOnboarded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
