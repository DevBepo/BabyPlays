"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AuthPageShell } from "@/components/client/AuthPageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { resetPassword } from "@/services/auth";
import type { ApiError } from "@/types/api";

type RecoveryCredentials = {
  uid: string;
  token: string;
};

function getFieldMessage(error: unknown, field: string) {
  const apiError = error as Partial<ApiError> | null;
  return apiError?.fieldErrors?.[field]?.[0];
}

function getErrorMessage(error: unknown) {
  const apiError = error as Partial<ApiError> | null;

  if (apiError?.status === 429) {
    return "Muitas tentativas. Aguarde antes de tentar novamente.";
  }

  return apiError?.message || "Não foi possível redefinir sua senha.";
}

export default function RedefinirSenhaPage() {
  const [credentials, setCredentials] = useState<RecoveryCredentials | null>(null);
  const [ready, setReady] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoNovaSenha, setConfirmacaoNovaSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const uid = params.get("uid");
    const token = params.get("token");
    window.history.replaceState(null, "", window.location.pathname);

    const updateId = window.setTimeout(() => {
      if (uid && token) {
        setCredentials({ uid, token });
      }
      setReady(true);
    }, 0);

    return () => window.clearTimeout(updateId);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!credentials) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword({
        ...credentials,
        nova_senha: novaSenha,
        confirmacao_nova_senha: confirmacaoNovaSenha,
      });
      setCredentials(null);
      setNovaSenha("");
      setConfirmacaoNovaSenha("");
      setSuccess(true);
    } catch (resetError) {
      setError(resetError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Segurança da conta"
      title="Crie uma nova senha"
      description="O link é temporário e deixa de funcionar assim que a senha for redefinida."
      footer={
        <Link
          href="/login"
          className="font-bold text-[#AB2E97] underline decoration-[#AB2E97]/25 underline-offset-4 transition-colors hover:text-[#803233]"
        >
          Voltar para o login
        </Link>
      }
    >
      {!ready ? (
        <p className="text-center text-sm font-semibold text-[#803233]/70">Validando link...</p>
      ) : success ? (
        <div className="space-y-5">
          <p role="status" className="rounded-2xl border border-[#76CFC8]/40 bg-[#E8F8F6] px-4 py-3 text-sm font-semibold leading-5 text-[#2C6F6A]">
            Senha redefinida com sucesso. Suas sessões anteriores foram invalidadas.
          </p>
          <Link className="flex min-h-12 items-center justify-center rounded-xl bg-[#AB2E97] px-6 font-semibold text-white hover:bg-[#803233]" href="/login">
            Entrar com a nova senha
          </Link>
        </div>
      ) : !credentials ? (
        <div className="space-y-5">
          <p role="alert" className="rounded-2xl border border-[#EA524B]/30 bg-[#FDECEB] px-4 py-3 text-sm font-semibold leading-5 text-[#803233]">
            Este link é inválido, já foi utilizado ou expirou.
          </p>
          <Link className="flex min-h-12 items-center justify-center rounded-xl border border-[#AB2E97]/25 px-6 font-semibold text-[#AB2E97] hover:bg-[#F7EAF5]" href="/esqueci-senha">
            Solicitar um novo link
          </Link>
        </div>
      ) : (
        <form className="flex flex-col gap-5 [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border-[#803233]/20 [&_input]:focus:border-[#AB2E97] [&_input]:focus:ring-[#AB2E97] [&_label]:font-semibold [&_label]:text-[#2C1615]" onSubmit={handleSubmit}>
          {error ? (
            <p role="alert" className="rounded-2xl border border-[#EA524B]/30 bg-[#FDECEB] px-4 py-3 text-sm font-semibold leading-5 text-[#803233]">
              {getErrorMessage(error)}
            </p>
          ) : null}

          <Input
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(event) => setNovaSenha(event.target.value)}
            error={getFieldMessage(error, "nova_senha")}
            required
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            value={confirmacaoNovaSenha}
            onChange={(event) => setConfirmacaoNovaSenha(event.target.value)}
            error={getFieldMessage(error, "confirmacao_nova_senha")}
            required
          />

          <Button type="submit" fullWidth loading={loading} className="!min-h-12 !rounded-xl !bg-[#AB2E97] !text-white hover:!bg-[#803233]">
            Redefinir senha
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}
