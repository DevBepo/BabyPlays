"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/TextArea";
import {
  atualizarBrinquedo,
  criarBrinquedo,
  criarUnidadeBrinquedo,
  excluirBrinquedo,
  listarBrinquedos,
  listarCategorias,
  listarUnidadesBrinquedo,
  uploadImagemBrinquedo,
} from "@/services/catalogo";
import { resolveMediaUrl } from "@/lib/media-url";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type {
  BrinquedoCatalogo,
  CategoriaCatalogo,
  UnidadeBrinquedoAdmin,
} from "@/types/catalogo";

type BrinquedoFormState = {
  nome: string;
  descricao: string;
  categoria: string;
  preco_diaria: string;
  preco_15_dias: string;
  preco_30_dias: string;
  ativo: boolean;
};

const initialForm: BrinquedoFormState = {
  nome: "",
  descricao: "",
  categoria: "",
  preco_diaria: "",
  preco_15_dias: "",
  preco_30_dias: "",
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

function formFromBrinquedo(brinquedo: BrinquedoCatalogo): BrinquedoFormState {
  return {
    nome: brinquedo.nome,
    descricao: brinquedo.descricao,
    categoria: brinquedo.categoria ? String(brinquedo.categoria.id) : "",
    preco_diaria: brinquedo.preco_diaria ?? "",
    preco_15_dias: brinquedo.preco_15_dias ?? "",
    preco_30_dias: brinquedo.preco_30_dias ?? "",
    ativo: brinquedo.ativo !== false,
  };
}

function periodoResumo(brinquedo: BrinquedoCatalogo) {
  if (!brinquedo.periodos_disponiveis.length) {
    return "Sem periodo";
  }

  return brinquedo.periodos_disponiveis
    .map((periodo) => `${periodo.label}: ${formatarMoeda(periodo.preco)}`)
    .join(" | ");
}

export default function ListaBrinquedosAdmin() {
  const [brinquedos, setBrinquedos] = useState<BrinquedoCatalogo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [brinquedoEmEdicao, setBrinquedoEmEdicao] = useState<number | null>(null);
  const [brinquedoRemovendo, setBrinquedoRemovendo] = useState<number | null>(null);
  const [form, setForm] = useState<BrinquedoFormState>(initialForm);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors | undefined>();
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);
  const [unidades, setUnidades] = useState<UnidadeBrinquedoAdmin[]>([]);
  const [unidadesLoading, setUnidadesLoading] = useState(false);
  const [criandoUnidade, setCriandoUnidade] = useState(false);
  const [unidadeCodigo, setUnidadeCodigo] = useState("");
  const [unidadeErro, setUnidadeErro] = useState<string | null>(null);
  const [unidadeSucesso, setUnidadeSucesso] = useState<string | null>(null);
  const [unidadesFieldErrors, setUnidadesFieldErrors] = useState<ApiFieldErrors | undefined>();
  const imagemPreviewUrl = useMemo(
    () => (imagemArquivo ? URL.createObjectURL(imagemArquivo) : null),
    [imagemArquivo],
  );

  useEffect(() => {
    return () => {
      if (imagemPreviewUrl) {
        URL.revokeObjectURL(imagemPreviewUrl);
      }
    };
  }, [imagemPreviewUrl]);

  const brinquedosOrdenados = useMemo(
    () => [...brinquedos].sort((a, b) => a.nome.localeCompare(b.nome)),
    [brinquedos],
  );
  const brinquedoAtual = useMemo(
    () =>
      brinquedoEmEdicao
        ? brinquedos.find((brinquedo) => brinquedo.id === brinquedoEmEdicao)
        : null,
    [brinquedoEmEdicao, brinquedos],
  );
  const imagemAtualUrl = resolveMediaUrl(brinquedoAtual?.imagem_principal?.url);

  const categoriasOptions = categorias.map((categoria) => ({
    value: String(categoria.id),
    label: categoria.nome,
  }));

  async function carregarBrinquedos() {
    setLoading(true);
    setErro(null);

    try {
      setBrinquedos(await listarBrinquedos());
    } catch (error) {
      setErro(
        isApiError(error)
          ? error.message
          : "Nao foi possivel carregar a lista de brinquedos.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function carregarDadosIniciais() {
      setLoading(true);
      setErro(null);

      try {
        const [categoriasDados, brinquedosDados] = await Promise.all([
          listarCategorias(),
          listarBrinquedos(),
        ]);

        if (active) {
          setCategorias(categoriasDados);
          setBrinquedos(brinquedosDados);
          setForm((current) => ({
            ...current,
            categoria:
              current.categoria ||
              (categoriasDados[0] ? String(categoriasDados[0].id) : ""),
          }));
        }
      } catch (error) {
        if (active) {
          setErro(
            isApiError(error)
              ? error.message
              : "Nao foi possivel carregar os dados do catalogo.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarDadosIniciais();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (brinquedoEmEdicao) {
      void carregarUnidades(brinquedoEmEdicao);
    }
  }, [brinquedoEmEdicao]);

  async function carregarUnidades(brinquedoId: number) {
    setUnidadesLoading(true);
    setUnidadeErro(null);
    setUnidadeSucesso(null);

    try {
      setUnidades(await listarUnidadesBrinquedo(brinquedoId));
    } catch (error) {
      setUnidadeErro(
        isApiError(error)
          ? error.message
          : "Nao foi possivel carregar as unidades do brinquedo.",
      );
    } finally {
      setUnidadesLoading(false);
    }
  }

  async function adicionarUnidade() {
    if (!brinquedoEmEdicao) {
      return;
    }

    const codigo = unidadeCodigo.trim();
    if (!codigo) {
      setUnidadeErro("Informe um codigo para a unidade.");
      return;
    }

    setUnidadeErro(null);
    setUnidadeSucesso(null);
    setUnidadesFieldErrors(undefined);
    setCriandoUnidade(true);

    try {
      await criarUnidadeBrinquedo(brinquedoEmEdicao, { codigo });
      setUnidadeSucesso("Unidade adicionada com sucesso.");
      setUnidadeCodigo("");
      await carregarUnidades(brinquedoEmEdicao);
      await carregarBrinquedos();
    } catch (error) {
      if (isApiError(error)) {
        setUnidadeErro(error.message);
        setUnidadesFieldErrors(error.fieldErrors);
      } else {
        setUnidadeErro("Nao foi possivel criar a unidade.");
      }
    } finally {
      setCriandoUnidade(false);
    }
  }

  function abrirNovoBrinquedo() {
    setForm({
      ...initialForm,
      categoria: categorias[0] ? String(categorias[0].id) : "",
    });
    setBrinquedoEmEdicao(null);
    setImagemArquivo(null);
    setFieldErrors(undefined);
    setErro(null);
    setSucesso(null);
    setUnidades([]);
    setUnidadeCodigo("");
    setUnidadeErro(null);
    setUnidadeSucesso(null);
    setUnidadesFieldErrors(undefined);
    setFormAberto(true);
  }

  function abrirEdicao(brinquedo: BrinquedoCatalogo) {
    setForm(formFromBrinquedo(brinquedo));
    setBrinquedoEmEdicao(brinquedo.id);
    setImagemArquivo(null);
    setFieldErrors(undefined);
    setErro(null);
    setSucesso(null);
    setFormAberto(true);
  }

  function fecharFormulario() {
    setFormAberto(false);
    setBrinquedoEmEdicao(null);
    setForm({
      ...initialForm,
      categoria: categorias[0] ? String(categorias[0].id) : "",
    });
    setFieldErrors(undefined);
    setImagemArquivo(null);
    setUnidades([]);
    setUnidadeCodigo("");
    setUnidadeErro(null);
    setUnidadeSucesso(null);
    setUnidadesFieldErrors(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    setFieldErrors(undefined);

    if (!form.categoria) {
      setErro("Selecione uma categoria antes de salvar o brinquedo.");
      setSalvando(false);
      return;
    }

    const payload = {
      nome: form.nome,
      descricao: form.descricao,
      categoria: Number(form.categoria),
      preco_diaria: form.preco_diaria || null,
      preco_15_dias: form.preco_15_dias || null,
      preco_30_dias: form.preco_30_dias || null,
      ativo: form.ativo,
    };

    try {
      if (brinquedoEmEdicao) {
        await atualizarBrinquedo(brinquedoEmEdicao, payload);
        if (imagemArquivo) {
          await uploadImagemBrinquedo(brinquedoEmEdicao, imagemArquivo);
        }
        setSucesso("Brinquedo atualizado com sucesso.");
      } else {
        const criado = await criarBrinquedo(payload);
        if (imagemArquivo && criado?.id) {
          await uploadImagemBrinquedo(criado.id, imagemArquivo);
        }
        setSucesso("Brinquedo criado com sucesso.");
      }

      await carregarBrinquedos();
      fecharFormulario();
    } catch (error) {
      if (isApiError(error)) {
        setErro(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setErro("Nao foi possivel salvar o brinquedo.");
      }
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemoverBrinquedo(brinquedo: BrinquedoCatalogo) {
    const confirmado = window.confirm(
      `Remover "${brinquedo.nome}" do catalogo? Esta acao pode arquivar o item se houver historico.`,
    );

    if (!confirmado) {
      return;
    }

    setBrinquedoRemovendo(brinquedo.id);
    setErro(null);
    setSucesso(null);

    try {
      const resultado = await excluirBrinquedo(brinquedo.id);
      setSucesso(resultado.detail);
      await carregarBrinquedos();
    } catch (error) {
      setErro(
        isApiError(error)
          ? error.message
          : "Nao foi possivel remover o brinquedo.",
      );
    } finally {
      setBrinquedoRemovendo(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Brinquedos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gerencie o catalogo de brinquedos disponiveis para aluguel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={abrirNovoBrinquedo}>
            Novo Brinquedo
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
                {brinquedoEmEdicao ? "Editar brinquedo" : "Novo brinquedo"}
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
              <Select
                label="Categoria *"
                options={categoriasOptions}
                value={form.categoria}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    categoria: event.target.value,
                  }))
                }
                disabled={categoriasOptions.length === 0}
                error={erroCampo(fieldErrors, "categoria")}
                required
                placeholder={
                  categoriasOptions.length === 0
                    ? "Cadastre uma categoria antes de criar brinquedos."
                    : "Selecione uma categoria..."
                }
              />
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
              <div className="relative h-28 overflow-hidden rounded-md border border-zinc-200 bg-white">
                {imagemPreviewUrl ? (
                  <Image
                    src={imagemPreviewUrl}
                    alt="Previa da imagem selecionada"
                    fill
                    className="object-cover"
                  />
                ) : imagemAtualUrl ? (
                  <Image
                    src={imagemAtualUrl}
                    alt="Imagem atual do brinquedo"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-400">
                    Sem imagem
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <Input
                  label="Imagem do brinquedo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    setImagemArquivo(event.target.files?.[0] ?? null);
                  }}
                />
              </div>
            </div>

            {brinquedoEmEdicao ? (
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Unidades fisicas</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Adicione unidades para controlar disponibilidade do brinquedo.
                    </p>
                  </div>
                </div>

                {unidadeSucesso ? (
                  <div className="mb-3 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                    {unidadeSucesso}
                  </div>
                ) : null}

                {unidadeErro ? (
                  <div className="mb-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                    {unidadeErro}
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    label="Codigo da unidade"
                    value={unidadeCodigo}
                    onChange={(event) => setUnidadeCodigo(event.target.value)}
                    error={erroCampo(unidadesFieldErrors, "codigo")}
                    placeholder="Ex: UNI-001"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    loading={criandoUnidade}
                    disabled={unidadesLoading}
                    onClick={adicionarUnidade}
                  >
                    Adicionar
                  </Button>
                </div>

                <div className="mt-5 space-y-2">
                  {unidadesLoading ? (
                    <p className="text-sm text-zinc-500">Carregando unidades...</p>
                  ) : unidades.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm text-zinc-700">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
                            <th className="px-3 py-2">Codigo</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {unidades.map((unidade) => (
                            <tr key={unidade.id}>
                              <td className="px-3 py-2">{unidade.codigo}</td>
                              <td className="px-3 py-2 text-zinc-600">{unidade.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Nenhuma unidade cadastrada ainda.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

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
              <Button
                type="submit"
                variant="primary"
                loading={salvando}
                disabled={categoriasOptions.length === 0}
              >
                {brinquedoEmEdicao ? "Salvar alteracoes" : "Criar brinquedo"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Periodos e precos</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-400">
                    Carregando catalogo de brinquedos...
                  </td>
                </tr>
              ) : brinquedosOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-400">
                    Nenhum brinquedo cadastrado ainda.
                  </td>
                </tr>
              ) : (
                brinquedosOrdenados.map((brinquedo) => (
                  <tr key={brinquedo.id} className="transition-colors hover:bg-zinc-50/50">
                    <td className="px-6 py-4 font-medium text-zinc-500">
                      #{brinquedo.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900">
                          {brinquedo.nome}
                        </span>
                        <span className="mt-0.5 text-xs text-zinc-400">
                          {brinquedo.categoria?.nome ?? "Sem categoria"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-teal-600">
                      {periodoResumo(brinquedo)}
                    </td>
                    <td className="px-6 py-4">
                      {brinquedo.ativo !== false ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="default">Inativo</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => abrirEdicao(brinquedo)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          loading={brinquedoRemovendo === brinquedo.id}
                          onClick={() => void handleRemoverBrinquedo(brinquedo)}
                        >
                          Remover
                        </Button>
                        <Link
                          href={`/brinquedos/${brinquedo.id}`}
                          target="_blank"
                          className="inline-flex items-center text-xs font-medium text-zinc-400 underline transition-colors hover:text-teal-600"
                        >
                          Ver na loja
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
