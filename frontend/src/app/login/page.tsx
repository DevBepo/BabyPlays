"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";

import { getAdminMe } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import type { ApiError } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

import Image from "next/image";

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
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 text-zinc-900">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="inline-block transition-opacity hover:opacity-80"
          >
            <Image
              src="/assets/LogoComEscrita.jpg"
              alt="Logo BabyPlays"
              width={150}
              height={50}
              priority
              className="object-contain"
            />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-zinc-950">
            Entrar na conta
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Acesse com seu e-mail para continuar sua reserva.
          </p>
        </div>

        <Card padding="lg">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
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

            <Button type="submit" fullWidth loading={loading}>
              Entrar
            </Button>
          </form>
        </Card>
        <p className="text-center text-sm text-zinc-600">
          Ainda não tem uma conta?{" "}
          <Link href="/register" className="font-semibold text-teal-600 hover:text-teal-700">
            Crie aqui
          </Link>
        </p>

      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
