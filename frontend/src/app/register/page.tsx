"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { apiPost } from "@/lib/api";
import type { ApiError } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

function getErrorMessage(error: unknown): string {
  const apiError = error as ApiError;
  
  // Se o backend devolver erros específicos de campos (ex: E-mail já cadastrado)
  if (apiError.fieldErrors) {
    const firstErrorKey = Object.keys(apiError.fieldErrors)[0];
    return apiError.fieldErrors[firstErrorKey]?.[0] || "Verifique os dados enviados.";
  }

  return apiError.message || "Não foi possível criar a conta. Tente novamente.";
}

function Register() {
  const router = useRouter();
  
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

    // Validação extra no frontend para garantir que as senhas são iguais
    if (senha !== confirmacaoSenha) {
      setError("As senhas não coincidem. Tente novamente.");
      setLoading(false);
      return;
    }

    try {
      // Usando os recursos do bakc pois ele já faz o login automatico 
      await apiPost("/api/auth/cadastro/", {
        nome,
        email,
        telefone,
        senha,
        confirmacao_senha: confirmacaoSenha,
      });
      
      // Força um reload redirecionando para a Home, 
      // para que o AuthContext perceba que o cookie de sessão foi criado.
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
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 text-zinc-900">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="inline-block transition-opacity hover:opacity-80"
          >
            <Image
              src="/assets/logo.jpg"
              alt="Logo BabyPlays"
              width={150}
              height={50}
              priority
              className="object-contain"
            />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-zinc-950">
            Criar nova conta
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Preencha os dados abaixo para se registar na loja.
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

            <div className="grid grid-cols-2 gap-4">
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

            <Button type="submit" fullWidth loading={loading} className="mt-2">
              Criar Conta
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-zinc-600">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-semibold text-teal-600 hover:text-teal-700">
            Entre aqui
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <Register />
    </Suspense>
  );
}