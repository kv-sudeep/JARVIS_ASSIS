/**
 * AuthContext.tsx — JARVIS Security Module
 * Provides authentication state to the entire app.
 * Token lives in-memory only (module variable in auth_api.ts).
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  fetchAuthStatus,
  isAuthenticated,
  clearToken,
  type AuthStatus,
} from "@/lib/auth_api";

interface AuthContextValue {
  status: AuthStatus | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus]     = useState<AuthStatus | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await fetchAuthStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    clearToken();
    setStatus((prev) => (prev ? { ...prev } : null));
  }, []);

  return (
    <AuthContext.Provider value={{ status, isLoggedIn: isAuthenticated(), isLoading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
