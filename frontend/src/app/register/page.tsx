"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";

import { AuthPageShell } from "@/components/client/AuthPageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiPost } from "@/lib/api";
import type { ApiError } from "@/types/api";

function getErrorMessage(error: unknown): string {
  const apiError = error as ApiError;

  if (apiError.fieldErrors) {
    const firstErrorKey = Object.keys(apiError.fieldErrors)[0];
    return apiError.fieldErrors[firstErrorKey]?.[0] || "Verifique os dados enviados.";
  }

  return apiError.message || "Não foi possível criar a conta. Tente novamente.";
}

function Register() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (senha !== confirmacaoSenha) {
      setError("As senhas não coincidem. Tente novamente.");
      setLoading(false);
      return;
    }

    try {
      await apiPost("/api/auth/cadastro/", {
        nome,
        email,
        telefone,
        senha,
        confirmacao_senha: confirmacaoSenha,
      });

      window.location.href = "/";
    } catch (err) {
      setSenha("");
      setConfirmacaoSenha("");
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Sua diversão começa aqui"
      title="Criar conta na BabyPlays"
      description="Cadastre-se para acompanhar seus pedidos e solicitações de um jeito simples e organizado."
      wide
      footer={
        <>
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="font-bold text-[#AB2E97] underline decoration-[#AB2E97]/25 underline-offset-4 transition-colors hover:text-[#803233]"
          >
            Entrar
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
          label="Nome Completo"
          name="nome"
          type="text"
          autoComplete="name"
          placeholder="Ex: Maria Silva"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          required
        />

        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="maria@exemplo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Input
          label="Telefone (WhatsApp)"
          name="telefone"
          type="tel"
          autoComplete="tel"
          placeholder="(51) 99999-9999"
          value={telefone}
          onChange={(event) => setTelefone(event.target.value)}
          required
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            required
          />

          <Input
            label="Confirmar Senha"
            name="confirmacao_senha"
            type="password"
            autoComplete="new-password"
            value={confirmacaoSenha}
            onChange={(event) => setConfirmacaoSenha(event.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          fullWidth
          loading={loading}
          className="mt-1 !min-h-12 !rounded-xl !bg-[#AB2E97] !text-white shadow-sm shadow-[#AB2E97]/20 hover:!bg-[#803233] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AB2E97]"
        >
          Criar Conta
        </Button>
      </form>
    </AuthPageShell>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <Register />
    </Suspense>
  );
}
