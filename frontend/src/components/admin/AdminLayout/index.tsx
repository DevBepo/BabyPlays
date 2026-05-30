"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useLayoutEffect, useState } from "react";

import { AdminSidebar } from "../AdminSideBar";
import { useAuth } from "@/hooks/useAuth";
import { getAdminMe } from "@/services/auth";
import type { ApiError } from "@/types/api";
import type { AdminMeResponse } from "@/types/auth";

interface AdminLayoutProps {
  children: ReactNode;
}

type AdminAccessState =
  | { status: "loading"; admin: null; message: string }
  | { status: "allowed"; admin: AdminMeResponse; message: string }
  | { status: "unauthenticated"; admin: null; message: string }
  | { status: "forbidden"; admin: null; message: string }
  | { status: "error"; admin: null; message: string };

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

function getAdminAccessErrorState(error: unknown): AdminAccessState {
  if (isApiError(error) && error.status === 401) {
    return {
      status: "unauthenticated",
      admin: null,
      message: "Entre com uma conta administrativa para acessar o painel.",
    };
  }

  if (isApiError(error) && error.status === 403) {
    return {
      status: "forbidden",
      admin: null,
      message:
        "Sua conta esta autenticada, mas nao tem permissao staff/admin para acessar este painel.",
    };
  }

  if (isNetworkError(error)) {
    return {
      status: "error",
      admin: null,
      message:
        "Nao foi possivel conectar ao backend. Confirme se o servidor esta rodando em 127.0.0.1:8000 e tente novamente.",
    };
  }

  return {
    status: "error",
    admin: null,
    message:
      "Nao foi possivel verificar o acesso agora. Tente novamente em instantes.",
  };
}

function AdminAccessFeedback({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] px-6 text-zinc-900 flex items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{message}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [access, setAccess] = useState<AdminAccessState>({
    status: "loading",
    admin: null,
    message: "Aguarde enquanto confirmamos sua sessao administrativa.",
  });
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  const handleLogout = async () => {
    setLogoutLoading(true);
    setLogoutError(null);

    try {
      await logout();
      router.replace("/login");
    } catch {
      setLogoutError("Nao foi possivel sair. Atualize a pagina e tente novamente.");
    } finally {
      setLogoutLoading(false);
    }
  };

  useLayoutEffect(() => {
    let active = true;

    async function verificarAdmin() {
      let nextAccess: AdminAccessState = {
        status: "error",
        admin: null,
        message:
          "Nao foi possivel verificar o acesso agora. Tente novamente em instantes.",
      };

      try {
        const data = await getAdminMe();

        nextAccess =
          data.is_staff || data.is_superuser
            ? {
                status: "allowed",
                admin: data,
                message: "",
              }
            : {
                status: "forbidden",
                admin: null,
                message:
                  "Sua conta esta autenticada, mas nao tem permissao staff/admin para acessar este painel.",
              };
      } catch (error) {
        nextAccess = getAdminAccessErrorState(error);
      } finally {
        if (active) {
          setAccess(nextAccess);
        }
      }
    }

    void verificarAdmin();

    return () => {
      active = false;
    };
  }, []);

  if (access.status === "loading") {
    return (
      <AdminAccessFeedback
        title="Verificando acesso"
        message={access.message}
      />
    );
  }

  if (access.status === "unauthenticated") {
    return (
      <AdminAccessFeedback
        title="Login necessario"
        message={access.message}
        action={
          <Link
            href={loginHref}
            className="inline-flex h-10 items-center justify-center rounded-md bg-teal-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Ir para login
          </Link>
        }
      />
    );
  }

  if (access.status === "forbidden") {
    return (
      <AdminAccessFeedback
        title="Acesso negado"
        message={access.message}
      />
    );
  }

  if (access.status === "error") {
    return (
      <AdminAccessFeedback
        title="Nao foi possivel verificar o acesso"
        message={access.message}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans antialiased">
      <AdminSidebar />

      <div className="pl-64 flex flex-col min-h-screen">
        <header className="h-14 bg-white border-b border-zinc-200 px-6 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              Ambiente de Gestao
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-zinc-800">
                Modo Administrador
              </span>
              <span className="text-[11px] text-zinc-500 font-normal">
                {access.admin.email}
              </span>
              {logoutError ? (
                <span className="mt-1 max-w-72 text-xs font-medium text-red-600">
                  {logoutError}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="h-8 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {logoutLoading ? "Saindo..." : "Sair"}
            </button>
            <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-semibold text-xs select-none">
              ADM
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 max-w-1600px w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
