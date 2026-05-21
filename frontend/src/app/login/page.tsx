"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import type { ApiError } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

function getSafeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

function getLoginErrorMessage(error: unknown): string {
  const status = (error as Partial<ApiError> | null)?.status;

  if (status === 400 || status === 401 || status === 403) {
    return "E-mail ou senha invalidos.";
  }

  return "Nao foi possivel entrar agora. Tente novamente em instantes.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, senha });
      router.push(getSafeNextPath(searchParams.get("next")));
    } catch (err) {
      setSenha("");
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div>
          <Link
            href="/"
            className="text-sm font-semibold text-teal-600 transition-colors hover:text-teal-700"
          >
            BabyPlays
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-zinc-950">Entrar na conta</h1>
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
