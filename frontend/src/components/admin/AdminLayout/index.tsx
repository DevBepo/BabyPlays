"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useLayoutEffect, useState } from "react";
import Image from "next/image";
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
        "Nao foi possivel conectar ao backend. Tente novamente em instantes.",
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
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-6 text-zinc-900">
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    if (!menuOpen || !window.matchMedia("(max-width: 1023px)").matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
    <div className="min-h-screen overflow-x-hidden bg-[#F8F9FA] font-sans text-zinc-900 antialiased">
      {menuOpen ? (
        <button
          type="button"
          aria-label="Fechar menu administrativo"
          className="fixed inset-0 z-30 bg-zinc-950/45 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <AdminSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div
        className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ease-out ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-20 flex h-20 min-w-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            aria-controls="admin-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 lg:hidden"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            Menu
          </button>

          <span className="relative hidden h-16 w-12 shrink-0 overflow-hidden lg:block">
            <Image
              src="/assets/LogoComEscrita.jpg"
              alt="BabyPlays - Locação de brinquedos"
              width={1275}
              height={990}
              sizes="97px"
              className="absolute left-1/2 top-1/2 h-[75px] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
              priority
            />
          </span>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-col text-right">
              <span className="text-xs font-semibold text-zinc-800">
                Modo Administrador
              </span>
              <span className="max-w-[110px] truncate text-[11px] font-normal text-zinc-500 sm:max-w-60">
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
              className="min-h-10 shrink-0 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {logoutLoading ? "Saindo..." : "Sair"}
            </button>
            <div className="hidden h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border border-teal-100 bg-teal-50 text-xs font-semibold text-teal-700 sm:flex">
              ADM
            </div>
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 animate-in fade-in duration-300 p-4 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}