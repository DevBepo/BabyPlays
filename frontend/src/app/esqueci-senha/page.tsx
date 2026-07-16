"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthPageShell } from "@/components/client/AuthPageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requestPasswordReset } from "@/services/auth";
import type { ApiError } from "@/types/api";

function getErrorMessage(error: unknown) {
  const apiError = error as Partial<ApiError> | null;

  if (apiError?.status === 429) {
    return "Muitas tentativas. Aguarde antes de solicitar outro link.";
  }

  if (apiError?.status === 503) {
    return "A recuperação de senha está temporariamente indisponível.";
  }

  return "Não foi possível solicitar a recuperação agora. Tente novamente.";
}

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await requestPasswordReset({ email });
      setMessage(response.message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Recuperação segura"
      title="Esqueceu sua senha?"
      description="Informe seu e-mail. Se houver uma conta cadastrada, enviaremos um link temporário e de uso único."
      footer={
        <Link
          href="/login"
          className="font-bold text-[#AB2E97] underline decoration-[#AB2E97]/25 underline-offset-4 transition-colors hover:text-[#803233]"
        >
          Voltar para o login
        </Link>
      }
    >
      <form
        className="flex flex-col gap-5 [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border-[#803233]/20 [&_input]:focus:border-[#AB2E97] [&_input]:focus:ring-[#AB2E97] [&_label]:font-semibold [&_label]:text-[#2C1615]"
        onSubmit={handleSubmit}
      >
        {error ? (
          <p role="alert" className="rounded-2xl border border-[#EA524B]/30 bg-[#FDECEB] px-4 py-3 text-sm font-semibold leading-5 text-[#803233]">
            {error}
          </p>
        ) : null}

        {message ? (
          <p role="status" className="rounded-2xl border border-[#76CFC8]/40 bg-[#E8F8F6] px-4 py-3 text-sm font-semibold leading-5 text-[#2C6F6A]">
            {message}
          </p>
        ) : null}

        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Button
          type="submit"
          fullWidth
          loading={loading}
          className="!min-h-12 !rounded-xl !bg-[#AB2E97] !text-white hover:!bg-[#803233]"
        >
          Enviar link seguro
        </Button>
      </form>
    </AuthPageShell>
  );
}
