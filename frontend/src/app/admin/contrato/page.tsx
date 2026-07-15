"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/TextArea";
import { obterAdminContrato, salvarAdminContrato } from "@/services/contrato";
import type { ApiError } from "@/types/api";

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Ainda nao salvo";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.fieldErrors) {
      return Object.values(error.fieldErrors).flat().join(" ");
    }
    return error.message;
  }

  return "Nao foi possivel salvar o contrato agora.";
}

export default function AdminContratoPage() {
  const [contratoId, setContratoId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState<string | undefined>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function carregarContrato() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const data = await obterAdminContrato();
        if (!active) {
          return;
        }

        setContratoId(data.id);
        setTitulo(data.titulo);
        setTexto(data.texto);
        setAtualizadoEm(data.atualizado_em);
      } catch (err) {
        if (!active) {
          return;
        }

        if (isApiError(err) && err.status === 404) {
          setContratoId(null);
          setTitulo("Contrato de locacao");
          setTexto("");
          setAtualizadoEm(undefined);
          return;
        }

        setError(getErrorMessage(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarContrato();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!titulo.trim() || !texto.trim()) {
      setError("Titulo e texto do contrato sao obrigatorios.");
      return;
    }

    setSaving(true);

    try {
      const data = await salvarAdminContrato(
        {
          titulo,
          texto,
        },
        contratoId !== null,
      );

      setContratoId(data.id);
      setTitulo(data.titulo);
      setTexto(data.texto);
      setAtualizadoEm(data.atualizado_em);
      setSuccess("Contrato salvo com sucesso.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Contrato de locacao</h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-500">
          Edite o texto apresentado ao cliente antes da finalizacao do pedido.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700"
        >
          {success}
        </div>
      )}

      <Card padding="lg">
        {loading ? (
          <p className="text-sm text-zinc-500">Carregando contrato...</p>
        ) : (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <Input
              label="Titulo"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              required
            />
            <Textarea
              label="Texto do contrato"
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              className="min-h-[300px] font-mono text-sm leading-6 sm:min-h-[420px]"
              required
            />
            <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs sm:text-sm text-zinc-500 text-center sm:text-left">
                Ultima atualizacao: {formatDateTime(atualizadoEm)}
              </p>
              <Button className="w-full sm:w-auto" type="submit" loading={saving}>
                Salvar contrato
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}