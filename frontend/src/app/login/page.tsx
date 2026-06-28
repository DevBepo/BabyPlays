"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";

import { AuthPageShell } from "@/components/client/AuthPageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { getAdminMe } from "@/services/auth";
import type { ApiError } from "@/types/api";

const DEFAULT_CLIENT_REDIRECT = "/";
const DEFAULT_ADMIN_REDIRECT = "/admin/pedidos";

function getSafeNextPath(next: string | null): string | null {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return null;
  }

  return next;
}

async function getDefaultRedirectPath(): Promise<string> {
  try {
    await getAdminMe();
    return DEFAULT_ADMIN_REDIRECT;
  } catch {
    return DEFAULT_CLIENT_REDIRECT;
  }
}

function getLoginErrorMessage(error: unknown): string {
  const status = (error as Partial<ApiError> | null)?.status;

  if (status === 400 || status === 401 || status === 403) {
    return "E-mail ou senha inválidos.";
  }

  return "Não foi possível entrar agora. Tente novamente em instantes.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextPath = getSafeNextPath(searchParams.get("next"));

  const getRedirectPath = useCallback(async () => {
    if (nextPath) {
      return nextPath;
    }

    return getDefaultRedirectPath();
  }, [nextPath]);

  useEffect(() => {
    let active = true;

    async function redirectAuthenticatedUser() {
      if (authLoading || loading || !isAuthenticated) {
        return;
      }

      const redirectPath = await getRedirectPath();

      if (active) {
        router.replace(redirectPath);
      }
    }

    void redirectAuthenticatedUser();

    return () => {
      active = false;
    };
  }, [authLoading, getRedirectPath, isAuthenticated, loading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, senha });
      router.push(await getRedirectPath());
    } catch (err) {
      setSenha("");
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Que bom ter você aqui"
      title="Entrar na BabyPlays"
      description="Acesse sua conta para acompanhar suas informações, pedidos e solicitações."
      footer={
        <>
          Ainda não tem uma conta?{" "}
          <Link
            href="/register"
            className="font-bold text-[#AB2E97] underline decoration-[#AB2E97]/25 underline-offset-4 transition-colors hover:text-[#803233]"
          >
            Criar conta
          </Link>
        </>
      }
    >
      <form
        className="flex flex-col gap-5 [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border-[#803233]/20 [&_input]:focus:border-[#AB2E97] [&_input]:focus:ring-[#AB2E97] [&_label]:font-semibold [&_label]:text-[#2C1615]"
        onSubmit={handleSubmit}
      >
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-[#EA524B]/30 bg-[#FDECEB] px-4 py-3 text-sm font-semibold leading-5 text-[#803233]"
          >
            {error}
          </div>
        )}

        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Input
          label="Senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          required
        />

        <Button
          type="submit"
          fullWidth
          loading={loading}
          className="!min-h-12 !rounded-xl !bg-[#AB2E97] !text-white shadow-sm shadow-[#AB2E97]/20 hover:!bg-[#803233] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AB2E97]"
        >
          Entrar
        </Button>
      </form>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
