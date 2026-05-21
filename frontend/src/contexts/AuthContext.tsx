"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as authService from "@/services/auth";
import type { ApiError } from "@/types/api";
import type { AuthUser, ClienteResumo, LoginPayload } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  cliente: ClienteResumo | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refreshMe: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

function isAnonymousAuthError(error: unknown): boolean {
  return isApiError(error) && (error.status === 401 || error.status === 403);
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [cliente, setCliente] = useState<ClienteResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setCliente(null);
  }, []);

  const refreshMe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await authService.getMe();
      setUser(data.user);
      setCliente(data.cliente);
    } catch (err) {
      clearSession();

      if (!isAnonymousAuthError(err)) {
        setError("Nao foi possivel verificar sua sessao agora.");
      }
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  const login = useCallback(async (payload: LoginPayload) => {
    setError(null);
    const data = await authService.login(payload);
    setUser(data.user);
    setCliente(data.cliente);
  }, []);

  const logout = useCallback(async () => {
    setError(null);

    try {
      await authService.logout();
    } catch (err) {
      if (!isAnonymousAuthError(err)) {
        setError("Nao foi possivel sair da conta agora.");
        throw err;
      }
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    let active = true;

    async function loadInitialSession() {
      try {
        const data = await authService.getMe();

        if (!active) {
          return;
        }

        setUser(data.user);
        setCliente(data.cliente);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }

        clearSession();

        if (!isAnonymousAuthError(err)) {
          setError("Nao foi possivel verificar sua sessao agora.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialSession();

    return () => {
      active = false;
    };
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      cliente,
      loading,
      error,
      isAuthenticated: Boolean(user),
      refreshMe,
      login,
      logout,
    }),
    [cliente, error, loading, login, logout, refreshMe, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
