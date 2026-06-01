"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/TextArea";
import { criarAdminKitFesta, listarAdminKitsFesta } from "@/services/adminKits";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type { AdminKitFesta } from "@/types/adminKits";

const FORM_INICIAL = {
  nome: "",
  descricao: "",
  preco_aluguel: "",
  ordem: "0",
  ativo: true,
};

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

function formatarMoeda(valor: string): string {
  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return "R$ 0,00";
  }

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function resumirItens(kit: AdminKitFesta): string {
  if (!kit.itens.length) {
    return "Composicao ainda nao cadastrada";
  }

  return kit.itens
    .map((item) => `${item.quantidade}x ${item.brinquedo.nome}`)
    .join(", ");
}

function erroCampo(fieldErrors: ApiFieldErrors | undefined, campo: string) {
  return fieldErrors?.[campo]?.join(" ");
}

export default function GestaoKitsPage() {
  const [kits, setKits] = useState<AdminKitFesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors | undefined>();
  const [form, setForm] = useState(FORM_INICIAL);

  const kitsOrdenados = useMemo(
    () => [...kits].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    [kits],
  );

  async function carregarKits() {
    setLoading(true);
    setErro(null);

    try {
      setKits(await listarAdminKitsFesta());
    } catch (error) {
      setErro(
        isApiError(error)
          ? error.message
          : "Nao foi possivel carregar os kits festa.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function carregarKitsInicial() {
      try {
        const dados = await listarAdminKitsFesta();

        if (active) {
          setKits(dados);
        }
      } catch (error) {
        if (active) {
          setErro(
            isApiError(error)
              ? error.message
              : "Nao foi possivel carregar os kits festa.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarKitsInicial();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    setFieldErrors(undefined);

    try {
      const novoKit = await criarAdminKitFesta({
        nome: form.nome,
        descricao: form.descricao,
        preco_aluguel: form.preco_aluguel,
        ativo: form.ativo,
        ordem: Number(form.ordem || 0),
      });

      setKits((atuais) => [novoKit, ...atuais]);
      setForm(FORM_INICIAL);
      setSucesso("Kit festa criado com sucesso.");
    } catch (error) {
      if (isApiError(error)) {
        setErro(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setErro("Nao foi possivel salvar o kit festa.");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestao de Kits Festa</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Cadastre pacotes prontos usando os dados reais do backend.
          </p>
        </div>
        <Button variant="outline" onClick={() => void carregarKits()} disabled={loading}>
          Atualizar
        </Button>
      </div>

      {erro ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
          {erro}
        </div>
      ) : null}

      {sucesso ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {sucesso}
        </div>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Novo kit festa</h2>
        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input
              label="Nome *"
              value={form.nome}
              onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))}
              error={erroCampo(fieldErrors, "nome")}
              required
            />
          </div>

          <Input
            label="Preco de aluguel (R$) *"
            type="number"
            min="0"
            step="0.01"
            value={form.preco_aluguel}
            onChange={(event) =>
              setForm((atual) => ({ ...atual, preco_aluguel: event.target.value }))
            }
            error={erroCampo(fieldErrors, "preco_aluguel")}
            required
          />

          <Input
            label="Ordem de exibicao"
            type="number"
            min="0"
            step="1"
            value={form.ordem}
            onChange={(event) => setForm((atual) => ({ ...atual, ordem: event.target.value }))}
            error={erroCampo(fieldErrors, "ordem")}
          />

          <div className="md:col-span-2">
            <Textarea
              label="Descricao *"
              value={form.descricao}
              onChange={(event) =>
                setForm((atual) => ({ ...atual, descricao: event.target.value }))
              }
              error={erroCampo(fieldErrors, "descricao")}
              required
            />
          </div>

          <div className="flex items-center">
            <Checkbox
              label="Ativo no catalogo"
              checked={form.ativo}
              onChange={(event) => setForm((atual) => ({ ...atual, ativo: event.target.checked }))}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={salvando}>
              Salvar kit festa
            </Button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Kits cadastrados</h2>
          <span className="text-sm text-zinc-500">{kitsOrdenados.length} kit(s)</span>
        </div>

        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
            Carregando kits festa...
          </div>
        ) : kitsOrdenados.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
            Nenhum kit festa cadastrado ainda.
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Nome do kit</Th>
                <Th>Composicao</Th>
                <Th>Preco</Th>
                <Th>Status</Th>
                <Th>Ordem</Th>
              </Tr>
            </Thead>
            <Tbody>
              {kitsOrdenados.map((kit) => (
                <Tr key={kit.id}>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-900">{kit.nome}</span>
                      <span className="mt-0.5 max-w-md truncate text-xs text-zinc-400">
                        {kit.descricao}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-sm text-zinc-600">{resumirItens(kit)}</span>
                  </Td>
                  <Td className="font-medium text-zinc-900">
                    {formatarMoeda(kit.preco_aluguel)}
                  </Td>
                  <Td>
                    {kit.ativo ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="default">Inativo</Badge>
                    )}
                  </Td>
                  <Td>{kit.ordem}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
