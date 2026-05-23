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
import type {
  AuthMeResponse,
  AuthUser,
  ClienteResumo,
  LoginPayload,
} from "@/types/auth";

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

function errorTextIncludes(error: ApiError, value: string): boolean {
  const normalizedValue = value.toLowerCase();
  const data = error.data;
  const candidates = [error.message];

  if (typeof data === "string") {
    candidates.push(data);
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const detail = data.detail;

    if (typeof detail === "string") {
      candidates.push(detail);
    }
  }

  return candidates.some((candidate) =>
    candidate.toLowerCase().includes(normalizedValue),
  );
}

function isCsrfLogoutError(error: unknown): boolean {
  return isApiError(error) && error.status === 403 && errorTextIncludes(error, "csrf");
}

function isAlreadyLoggedOutError(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.status === 401 || (error.status === 403 && !isCsrfLogoutError(error)))
  );
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

  const applyAuthState = useCallback(
    (data: AuthMeResponse) => {
      if (data.authenticated && data.user) {
        setUser(data.user);
        setCliente(data.cliente);
        return;
      }

      clearSession();
    },
    [clearSession],
  );

  const refreshMe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await authService.getMe();
      applyAuthState(data);
    } catch (err) {
      clearSession();

      if (!isAnonymousAuthError(err)) {
        setError("Nao foi possivel verificar sua sessao agora.");
      }
    } finally {
      setLoading(false);
    }
  }, [applyAuthState, clearSession]);

  const login = useCallback(async (payload: LoginPayload) => {
    setError(null);
    const data = await authService.login(payload);
    applyAuthState(data);
  }, [applyAuthState]);

  const logout = useCallback(async () => {
    setError(null);

    try {
      await authService.logout();
      clearSession();
    } catch (err) {
      if (isAlreadyLoggedOutError(err)) {
        clearSession();
        return;
      }

      if (isCsrfLogoutError(err)) {
        setError("Nao foi possivel validar a seguranca da sessao para sair. Atualize a pagina e tente novamente.");
      } else {
        setError("Nao foi possivel encerrar a sessao no servidor agora.");
      }

      throw err;
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

        applyAuthState(data);
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
  }, [applyAuthState, clearSession]);

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
