"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

import { AdminSidebar } from "../AdminSideBar";
import { getAdminMe } from "@/services/auth";
import type { ApiError } from "@/types/api";
import type { AdminMeResponse } from "@/types/auth";

interface AdminLayoutProps {
  children: ReactNode;
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
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
  const [admin, setAdmin] = useState<AdminMeResponse | null>(null);
  const [status, setStatus] = useState<
    "loading" | "allowed" | "unauthenticated" | "forbidden" | "error"
  >("loading");

  useEffect(() => {
    let active = true;

    async function verificarAdmin() {
      try {
        const data = await getAdminMe();

        if (!active) {
          return;
        }

        setAdmin(data);
        setStatus("allowed");
      } catch (error) {
        if (!active) {
          return;
        }

        setAdmin(null);

        if (isApiError(error) && error.status === 401) {
          setStatus("unauthenticated");
          return;
        }

        if (isApiError(error) && error.status === 403) {
          setStatus("forbidden");
          return;
        }

        setStatus("error");
      }
    }

    void verificarAdmin();

    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <AdminAccessFeedback
        title="Verificando acesso"
        message="Aguarde enquanto confirmamos sua sessao administrativa."
      />
    );
  }

  if (status === "unauthenticated") {
    return (
      <AdminAccessFeedback
        title="Login necessario"
        message="Entre com uma conta administrativa para acessar o painel."
        action={
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-teal-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Ir para login
          </Link>
        }
      />
    );
  }

  if (status === "forbidden") {
    return (
      <AdminAccessFeedback
        title="Acesso negado"
        message="Sua conta esta autenticada, mas nao tem permissao staff/admin para acessar este painel."
      />
    );
  }

  if (status === "error" || !admin) {
    return (
      <AdminAccessFeedback
        title="Nao foi possivel verificar o acesso"
        message="Tente novamente em instantes. O painel administrativo nao sera exibido ate a permissao ser confirmada pelo servidor."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans antialiased">
      <AdminSidebar />

      <div className="pl-64 flex flex-col min-h-screen">
        <header className="h-20 bg-white border-b border-zinc-200 px-8 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Ambiente de Gestao
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-zinc-800">
                Modo Administrador
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {admin.email}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm select-none">
              ADM
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-[1600px] w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
