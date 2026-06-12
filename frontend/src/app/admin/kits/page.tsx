"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/TextArea";
import {
  atualizarAdminKitFesta,
  criarAdminKitFesta,
  excluirAdminKitFesta,
  listarAdminKitsFesta,
  removerImagemAdminKitFesta,
  uploadImagemAdminKitFesta,
} from "@/services/adminKits";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type { AdminKitFesta } from "@/types/adminKits";

type KitFormState = {
  nome: string;
  descricao: string;
  preco_diaria: string;
  preco_15_dias: string;
  preco_30_dias: string;
  ativo: boolean;
  ordem: string;
};

const initialForm: KitFormState = {
  nome: "",
  descricao: "",
  preco_diaria: "",
  preco_15_dias: "",
  preco_30_dias: "",
  ativo: true,
  ordem: "0",
};

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

function erroCampo(fieldErrors: ApiFieldErrors | undefined, campo: string) {
  return fieldErrors?.[campo]?.join(" ");
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

function formFromKit(kit: AdminKitFesta): KitFormState {
  return {
    nome: kit.nome,
    descricao: kit.descricao,
    preco_diaria: kit.preco_diaria ?? "",
    preco_15_dias: kit.preco_15_dias ?? "",
    preco_30_dias: kit.preco_30_dias ?? "",
    ativo: kit.ativo,
    ordem: String(kit.ordem),
  };
}

function periodoResumo(kit: AdminKitFesta): string {
  if (!kit.periodos_disponiveis.length) {
    return "Sem periodo";
  }

  return kit.periodos_disponiveis
    .map((periodo) => `${periodo.label}: ${formatarMoeda(periodo.preco)}`)
    .join(" | ");
}

export default function GestaoKitsPage() {
  const [kits, setKits] = useState<AdminKitFesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [kitEmEdicao, setKitEmEdicao] = useState<number | null>(null);
  const [kitRemovendo, setKitRemovendo] = useState<number | null>(null);
  const [kitAlterandoStatus, setKitAlterandoStatus] = useState<number | null>(null);
  const [form, setForm] = useState<KitFormState>(initialForm);
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);
  const [removerImagemAtual, setRemoverImagemAtual] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors | undefined>();

  const kitsOrdenados = useMemo(
    () => [...kits].sort((a, b) => a.nome.localeCompare(b.nome)),
    [kits],
  );
  const imagemPreviewUrl = useMemo(
    () => (imagemArquivo ? URL.createObjectURL(imagemArquivo) : null),
    [imagemArquivo],
  );

  async function carregarKitsFesta() {
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
      setLoading(true);
      setErro(null);

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

  useEffect(() => {
    return () => {
      if (imagemPreviewUrl) {
        URL.revokeObjectURL(imagemPreviewUrl);
      }
    };
  }, [imagemPreviewUrl]);

  function abrirNovoKit() {
    setForm(initialForm);
    setKitEmEdicao(null);
    setImagemArquivo(null);
    setRemoverImagemAtual(false);
    setFieldErrors(undefined);
    setErro(null);
    setSucesso(null);
    setFormAberto(true);
  }

  function abrirEdicao(kit: AdminKitFesta) {
    setForm(formFromKit(kit));
    setKitEmEdicao(kit.id);
    setImagemArquivo(null);
    setRemoverImagemAtual(false);
    setFieldErrors(undefined);
    setErro(null);
    setSucesso(null);
    setFormAberto(true);
  }

  function fecharFormulario() {
    setFormAberto(false);
    setKitEmEdicao(null);
    setForm(initialForm);
    setImagemArquivo(null);
    setRemoverImagemAtual(false);
    setFieldErrors(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    setFieldErrors(undefined);

    const payload = {
      nome: form.nome,
      descricao: form.descricao,
      preco_diaria: form.preco_diaria || null,
      preco_15_dias: form.preco_15_dias || null,
      preco_30_dias: form.preco_30_dias || null,
      ativo: form.ativo,
      ordem: Number(form.ordem || 0),
    };

    try {
      if (kitEmEdicao) {
        const kitAtualizado = await atualizarAdminKitFesta(kitEmEdicao, payload);
        if (removerImagemAtual && !imagemArquivo) {
          await removerImagemAdminKitFesta(kitAtualizado.id);
        }
        if (imagemArquivo) {
          await uploadImagemAdminKitFesta(kitAtualizado.id, imagemArquivo);
        }
        setSucesso("Kit festa atualizado com sucesso.");
      } else {
        const kitCriado = await criarAdminKitFesta(payload);
        if (imagemArquivo) {
          await uploadImagemAdminKitFesta(kitCriado.id, imagemArquivo);
        }
        setSucesso("Kit festa criado com sucesso.");
      }

      await carregarKitsFesta();
      fecharFormulario();
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

  async function handleRemoverKit(kit: AdminKitFesta) {
    const confirmado = window.confirm(
      `Remover "${kit.nome}" do catalogo? Esta acao pode arquivar o kit se houver historico ou composicao.`,
    );

    if (!confirmado) {
      return;
    }

    setKitRemovendo(kit.id);
    setErro(null);
    setSucesso(null);

    try {
      const resultado = await excluirAdminKitFesta(kit.id);
      setSucesso(resultado.detail);
      await carregarKitsFesta();
    } catch (error) {
      setErro(
        isApiError(error) ? error.message : "Nao foi possivel remover o kit festa.",
      );
    } finally {
      setKitRemovendo(null);
    }
  }

  async function handleAlternarStatusKit(kit: AdminKitFesta) {
    const novoStatusAtivo = !kit.ativo;

    setKitAlterandoStatus(kit.id);
    setErro(null);
    setSucesso(null);

    try {
      await atualizarAdminKitFesta(kit.id, { ativo: novoStatusAtivo });
      setSucesso(
        novoStatusAtivo
          ? "Kit festa ativado com sucesso."
          : "Kit festa desativado com sucesso.",
      );
      await carregarKitsFesta();
    } catch (error) {
      setErro(
        isApiError(error)
          ? error.message
          : "Nao foi possivel atualizar o status do kit festa.",
      );
    } finally {
      setKitAlterandoStatus(null);
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
        <div className="flex items-center gap-3">
          <Button type="button" variant="primary" onClick={abrirNovoKit}>
            Novo Kit Festa
          </Button>
        </div>
      </div>

      {sucesso ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {sucesso}
        </div>
      ) : null}

      {erro ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
          {erro}
        </div>
      ) : null}

      {formAberto ? (
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {kitEmEdicao ? "Editar kit festa" : "Novo kit festa"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Ao salvar, a listagem abaixo busca novamente os dados da API.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input
                  label="Nome *"
                  value={form.nome}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nome: event.target.value }))
                  }
                  error={erroCampo(fieldErrors, "nome")}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-zinc-700">
                  Precos por periodo
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Preencha apenas os periodos que estarao disponiveis para locacao.
                </p>
              </div>
              <Input
                label="Diaria (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.preco_diaria}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    preco_diaria: event.target.value,
                  }))
                }
                error={erroCampo(fieldErrors, "preco_diaria")}
              />
              <Input
                label="15 dias (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.preco_15_dias}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    preco_15_dias: event.target.value,
                  }))
                }
                error={erroCampo(fieldErrors, "preco_15_dias")}
              />
              <Input
                label="30 dias (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.preco_30_dias}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    preco_30_dias: event.target.value,
                  }))
                }
                error={erroCampo(fieldErrors, "preco_30_dias")}
              />
              <Input
                label="Ordem de exibicao"
                type="number"
                step="1"
                min="0"
                value={form.ordem}
                onChange={(event) =>
                  setForm((current) => ({ ...current, ordem: event.target.value }))
                }
                error={erroCampo(fieldErrors, "ordem")}
              />
            </div>

            <Textarea
              label="Descricao completa *"
              value={form.descricao}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  descricao: event.target.value,
                }))
              }
              error={erroCampo(fieldErrors, "descricao")}
              required
            />

            <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-[160px_minmax(0,1fr)]">
              <div className="h-28 overflow-hidden rounded-md border border-zinc-200 bg-white">
                {imagemPreviewUrl ? (
                  <img
                    src={imagemPreviewUrl}
                    alt="Previa da imagem selecionada"
                    className="h-full w-full object-cover"
                  />
                ) : kitEmEdicao &&
                  kits.find((kit) => kit.id === kitEmEdicao)?.imagem_url &&
                  !removerImagemAtual ? (
                  <img
                    src={kits.find((kit) => kit.id === kitEmEdicao)?.imagem_url ?? ""}
                    alt="Imagem atual do kit festa"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-400">
                    Sem imagem
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <Input
                  label="Imagem do kit festa"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    setImagemArquivo(event.target.files?.[0] ?? null);
                    setRemoverImagemAtual(false);
                  }}
                />
                {kitEmEdicao &&
                kits.find((kit) => kit.id === kitEmEdicao)?.imagem_url ? (
                  <Checkbox
                    label="Remover imagem atual"
                    checked={removerImagemAtual}
                    onChange={(event) => {
                      setRemoverImagemAtual(event.target.checked);
                      if (event.target.checked) {
                        setImagemArquivo(null);
                      }
                    }}
                  />
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <div className="flex flex-col gap-3">
                <Checkbox
                  label="Ativo no catalogo"
                  checked={form.ativo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ativo: event.target.checked,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
              <Button type="button" variant="ghost" onClick={fecharFormulario}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={salvando}>
                {kitEmEdicao ? "Salvar alteracoes" : "Criar kit festa"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

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
                <Th>Imagem</Th>
                <Th>Composicao</Th>
                <Th>Periodos e precos</Th>
                <Th>Status</Th>
                <Th className="text-right">Acoes</Th>
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
                    <div className="h-14 w-20 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                      {kit.imagem_url ? (
                        <img
                          src={kit.imagem_url}
                          alt={kit.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-medium text-zinc-400">
                          Sem imagem
                        </div>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-sm text-zinc-600">{resumirItens(kit)}</span>
                  </Td>
                  <Td className="font-medium text-zinc-900">
                    {periodoResumo(kit)}
                  </Td>
                  <Td>
                    {kit.ativo ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="default">Inativo</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => abrirEdicao(kit)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={kit.ativo ? "outline" : "secondary"}
                        loading={kitAlterandoStatus === kit.id}
                        disabled={kitRemovendo === kit.id}
                        onClick={() => void handleAlternarStatusKit(kit)}
                      >
                        {kit.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        loading={kitRemovendo === kit.id}
                        disabled={kitAlterandoStatus === kit.id}
                        onClick={() => void handleRemoverKit(kit)}
                      >
                        Remover
                      </Button>
                      {kit.ativo ? (
                        <Link
                          href="/#kits-festa"
                          target="_blank"
                          className="inline-flex items-center text-xs font-medium text-zinc-400 underline transition-colors hover:text-teal-600"
                        >
                          Ver na loja
                        </Link>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium text-zinc-400">
                          Oculto na loja
                        </span>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
