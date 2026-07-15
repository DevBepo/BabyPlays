"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { InlineCategoryModal } from "@/components/admin/InlineCategoryModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/TextArea";
import {
  atualizarBrinquedo,
  atualizarStatusUnidadeBrinquedo,
  criarBrinquedo,
  criarUnidadeBrinquedo,
  definirImagemPrincipalBrinquedo,
  excluirBrinquedo,
  listarBrinquedos,
  listarCategorias,
  listarUnidadesBrinquedo,
  removerImagemBrinquedo,
  uploadImagensBrinquedo,
} from "@/services/catalogo";
import { resolveMediaUrl } from "@/lib/media-url";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type {
  BrinquedoCatalogo,
  CategoriaCatalogo,
  UnidadeBrinquedoAdmin,
  UnidadeBrinquedoStatus,
} from "@/types/catalogo";

const STATUS_UNIDADE_OPTIONS = [
  { value: "disponivel", label: "Disponivel" },
  { value: "reservada", label: "Reservada" },
  { value: "em_locacao", label: "Alugado" },
  { value: "higienizacao", label: "Higienizacao" },
  { value: "manutencao", label: "Manutencao" },
  { value: "standby", label: "Standby" },
  { value: "baixada", label: "Baixada" },
];

const STATUS_CATALOGO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "disponivel", label: "Disponiveis" },
  { value: "alugado", label: "Alugados" },
  { value: "oculto", label: "Ocultos / desativados" },
];

const QUANTIDADE_INICIAL = 12;

type StatusCatalogoFiltro = "todos" | "disponivel" | "alugado" | "oculto";

type BrinquedoFormState = {
  nome: string;
  descricao: string;
  categoria: string;
  preco_diaria: string;
  preco_3_dias: string;
  preco_15_dias: string;
  preco_30_dias: string;
  ativo: boolean;
};

const initialForm: BrinquedoFormState = {
  nome: "",
  descricao: "",
  categoria: "",
  preco_diaria: "",
  preco_3_dias: "",
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
    preco_3_dias: brinquedo.preco_3_dias ?? "",
    preco_15_dias: brinquedo.preco_15_dias ?? "",
    preco_30_dias: brinquedo.preco_30_dias ?? "",
    ativo: brinquedo.ativo !== false,
  };
}

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function statusAdministrativo(brinquedo: BrinquedoCatalogo) {
  if (brinquedo.ativo === false) {
    return "oculto";
  }
  if (brinquedo.status_catalogo === "disponivel") {
    return "disponivel";
  }
  return "alugado";
}

export default function ListaBrinquedosAdmin() {
  const [brinquedos, setBrinquedos] = useState<BrinquedoCatalogo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [brinquedoEmEdicao, setBrinquedoEmEdicao] = useState<number | null>(null);
  const [brinquedoRemovendo, setBrinquedoRemovendo] = useState<number | null>(null);
  const [brinquedoAlterandoStatus, setBrinquedoAlterandoStatus] = useState<number | null>(null);
  const [form, setForm] = useState<BrinquedoFormState>(initialForm);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors | undefined>();
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);
  const [imagensAdicionais, setImagensAdicionais] = useState<File[]>([]);
  const [imagemAlterando, setImagemAlterando] = useState<number | null>(null);
  const [unidades, setUnidades] = useState<UnidadeBrinquedoAdmin[]>([]);
  const [unidadesLoading, setUnidadesLoading] = useState(false);
  const [criandoUnidade, setCriandoUnidade] = useState(false);
  const [unidadeAlterandoStatus, setUnidadeAlterandoStatus] = useState<number | null>(null);
  const [unidadeCodigo, setUnidadeCodigo] = useState("");
  const [unidadeErro, setUnidadeErro] = useState<string | null>(null);
  const [unidadeSucesso, setUnidadeSucesso] = useState<string | null>(null);
  const [unidadesFieldErrors, setUnidadesFieldErrors] = useState<ApiFieldErrors | undefined>();
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [statusFiltro, setStatusFiltro] = useState<StatusCatalogoFiltro>("todos");
  const [quantidadeVisivel, setQuantidadeVisivel] = useState(QUANTIDADE_INICIAL);
  const [categoriaModalAberta, setCategoriaModalAberta] = useState(false);
  const imagemPreviewUrl = useMemo(
    () => (imagemArquivo ? URL.createObjectURL(imagemArquivo) : null),
    [imagemArquivo],
  );
  const imagensAdicionaisPreview = useMemo(
    () => imagensAdicionais.map((arquivo) => ({
      arquivo,
      url: URL.createObjectURL(arquivo),
    })),
    [imagensAdicionais],
  );

  useEffect(() => {
    return () => {
      if (imagemPreviewUrl) {
        URL.revokeObjectURL(imagemPreviewUrl);
      }
    };
  }, [imagemPreviewUrl]);

  useEffect(() => {
    return () => imagensAdicionaisPreview.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [imagensAdicionaisPreview]);

  function removerFotoAdicionalSelecionada(arquivo: File) {
    setImagensAdicionais((atuais) => atuais.filter((item) => item !== arquivo));
  }

  const brinquedosOrdenados = useMemo(
    () => [...brinquedos].sort((a, b) => a.nome.localeCompare(b.nome)),
    [brinquedos],
  );
  const brinquedosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);

    return brinquedosOrdenados.filter((brinquedo) => {
      const correspondeBusca =
        !termo || normalizarBusca(brinquedo.nome).includes(termo);
      const correspondeCategoria =
        categoriaFiltro === "todas" ||
        String(brinquedo.categoria?.id ?? "") === categoriaFiltro;
      const correspondeStatus =
        statusFiltro === "todos" ||
        statusAdministrativo(brinquedo) === statusFiltro;

      return correspondeBusca && correspondeCategoria && correspondeStatus;
    });
  }, [brinquedosOrdenados, busca, categoriaFiltro, statusFiltro]);
  const brinquedosVisiveis = brinquedosFiltrados.slice(0, quantidadeVisivel);
  const temFiltros =
    busca.trim().length > 0 || categoriaFiltro !== "todas" || statusFiltro !== "todos";
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
  const categoriasFiltroOptions = [
    { value: "todas", label: "Todas as categorias" },
    ...categoriasOptions,
  ];

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

  async function alterarStatusUnidade(
    unidade: UnidadeBrinquedoAdmin,
    novoStatus: UnidadeBrinquedoStatus,
  ) {
    if (novoStatus === unidade.status) {
      return;
    }

    setUnidadeAlterandoStatus(unidade.id);
    setUnidadeErro(null);
    setUnidadeSucesso(null);

    try {
      await atualizarStatusUnidadeBrinquedo(unidade.id, novoStatus);
      setUnidadeSucesso(`Status da unidade ${unidade.codigo} atualizado.`);
      if (brinquedoEmEdicao) {
        await carregarUnidades(brinquedoEmEdicao);
      }
      await carregarBrinquedos();
    } catch (error) {
      setUnidadeErro(
        isApiError(error)
          ? error.message
          : "Nao foi possivel atualizar o status da unidade.",
      );
    } finally {
      setUnidadeAlterandoStatus(null);
    }
  }

  function rolarParaFormulario(destino = "formulario-brinquedo") {
    window.setTimeout(() => {
      document.getElementById(destino)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function abrirNovoBrinquedo() {
    setForm({
      ...initialForm,
      categoria: categorias[0] ? String(categorias[0].id) : "",
    });
    setBrinquedoEmEdicao(null);
    setImagemArquivo(null);
    setImagensAdicionais([]);
    setFieldErrors(undefined);
    setErro(null);
    setSucesso(null);
    setUnidades([]);
    setUnidadeCodigo("");
    setUnidadeErro(null);
    setUnidadeSucesso(null);
    setUnidadesFieldErrors(undefined);
    setFormAberto(true);
    rolarParaFormulario();
  }

  function abrirEdicao(
    brinquedo: BrinquedoCatalogo,
    destino = "formulario-brinquedo",
  ) {
    setForm(formFromBrinquedo(brinquedo));
    setBrinquedoEmEdicao(brinquedo.id);
    setImagemArquivo(null);
    setImagensAdicionais([]);
    setFieldErrors(undefined);
    setErro(null);
    setSucesso(null);
    setFormAberto(true);
    rolarParaFormulario(destino);
  }

  function limparFiltros() {
    setBusca("");
    setCategoriaFiltro("todas");
    setStatusFiltro("todos");
    setQuantidadeVisivel(QUANTIDADE_INICIAL);
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
    setImagensAdicionais([]);
    setUnidades([]);
    setUnidadeCodigo("");
    setUnidadeErro(null);
    setUnidadeSucesso(null);
    setUnidadesFieldErrors(undefined);
  }

  function handleCategoriaCriada(categoria: CategoriaCatalogo) {
    setCategorias((atuais) =>
      [...atuais.filter((item) => item.id !== categoria.id), categoria].sort((a, b) =>
        a.nome.localeCompare(b.nome),
      ),
    );
    setForm((current) => ({ ...current, categoria: String(categoria.id) }));
    setCategoriaFiltro((current) => (current === "todas" ? current : String(categoria.id)));
    setSucesso("Categoria criada e selecionada.");
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
      preco_3_dias: form.preco_3_dias || null,
      preco_15_dias: form.preco_15_dias || null,
      preco_30_dias: form.preco_30_dias || null,
      ativo: form.ativo,
    };

    try {
      if (brinquedoEmEdicao) {
        await atualizarBrinquedo(brinquedoEmEdicao, payload);
        const arquivos = imagemArquivo
          ? [imagemArquivo, ...imagensAdicionais]
          : imagensAdicionais;
        if (arquivos.length > 0) {
          await uploadImagensBrinquedo(
            brinquedoEmEdicao,
            arquivos,
            Boolean(imagemArquivo),
          );
        }
        setSucesso("Brinquedo atualizado com sucesso.");
      } else {
        const criado = await criarBrinquedo(payload);
        const arquivos = imagemArquivo
          ? [imagemArquivo, ...imagensAdicionais]
          : imagensAdicionais;
        if (arquivos.length > 0 && criado?.id) {
          await uploadImagensBrinquedo(criado.id, arquivos, Boolean(imagemArquivo));
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

  async function removerImagem(imagemId: number) {
    if (!brinquedoEmEdicao || !window.confirm("Remover esta foto do brinquedo?")) return;
    setImagemAlterando(imagemId);
    setErro(null);
    try {
      await removerImagemBrinquedo(brinquedoEmEdicao, imagemId);
      await carregarBrinquedos();
      setSucesso("Foto removida com sucesso.");
    } catch (error) {
      setErro(isApiError(error) ? error.message : "Nao foi possivel remover a foto.");
    } finally {
      setImagemAlterando(null);
    }
  }

  async function definirImagemPrincipal(imagemId: number) {
    if (!brinquedoEmEdicao) return;
    setImagemAlterando(imagemId);
    setErro(null);
    try {
      await definirImagemPrincipalBrinquedo(brinquedoEmEdicao, imagemId);
      await carregarBrinquedos();
      setSucesso("Foto principal atualizada com sucesso.");
    } catch (error) {
      setErro(isApiError(error) ? error.message : "Nao foi possivel definir a foto principal.");
    } finally {
      setImagemAlterando(null);
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

  async function handleAlternarStatusBrinquedo(brinquedo: BrinquedoCatalogo) {
    const novoStatusAtivo = brinquedo.ativo === false;

    setBrinquedoAlterandoStatus(brinquedo.id);
    setErro(null);
    setSucesso(null);

    try {
      await atualizarBrinquedo(brinquedo.id, { ativo: novoStatusAtivo });
      setSucesso(
        novoStatusAtivo
          ? "Brinquedo exibido no catalogo."
          : "Brinquedo ocultado do catalogo.",
      );
      await carregarBrinquedos();
    } catch (error) {
      setErro(
        isApiError(error)
          ? error.message
          : "Nao foi possivel atualizar o status do brinquedo.",
      );
    } finally {
      setBrinquedoAlterandoStatus(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Brinquedos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gerencie o catálogo, preços, unidades e disponibilidade.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="w-full sm:w-auto" variant="primary" onClick={abrirNovoBrinquedo}>
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
        <div id="formulario-brinquedo" className="scroll-mt-6">
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
              <Input
                label="Nome *"
                value={form.nome}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nome: event.target.value }))
                }
                error={erroCampo(fieldErrors, "nome")}
                required
              />
              <div className="flex flex-col gap-2">
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
                <button
                  type="button"
                  onClick={() => setCategoriaModalAberta(true)}
                  className="w-fit rounded-lg px-2 py-1 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  Nova categoria
                </button>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-zinc-700">
                  Precos e periodos
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Preencha apenas os periodos que estarao disponiveis para locacao.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 md:col-span-2 sm:p-4 xl:grid-cols-4">
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
                label="3 dias (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.preco_3_dias}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    preco_3_dias: event.target.value,
                  }))
                }
                error={erroCampo(fieldErrors, "preco_3_dias")}
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
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
            <Textarea
              label="Descricao do brinquedo *"
              placeholder="Explique o brinquedo, a idade recomendada e seus principais beneficios."
              rows={4}
              className="min-h-[112px] max-h-[320px] leading-6"
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
            <p className="mt-2 text-xs leading-5 text-zinc-500">Use uma descricao curta e clara para explicar o brinquedo, idade recomendada e principais beneficios.</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="border-b border-zinc-100 pb-4">
                <p className="text-lg font-semibold text-zinc-900">Imagens do brinquedo</p>
                <p className="mt-1 text-sm text-zinc-500">Gerencie a imagem dos cards e a galeria publica.</p>
              </div>

              <div className="py-5">
                <p className="text-sm font-semibold text-zinc-900">Foto principal</p>
                <p className="mt-1 text-xs text-zinc-500">Usada nos cards e na pagina principal.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(220px,280px)_1fr] sm:items-start">
              <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                {imagemPreviewUrl ? (
                  <Image
                    src={imagemPreviewUrl}
                    alt="Previa da imagem selecionada"
                    fill
                    className="object-contain p-2"
                  />
                ) : imagemAtualUrl ? (
                  <Image
                    src={imagemAtualUrl}
                    alt="Imagem atual do brinquedo"
                    fill
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-400">
                    Sem imagem
                  </div>
                )}
                {imagemPreviewUrl || imagemAtualUrl ? <span className="absolute left-2 top-2 rounded-full bg-[#803233] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">Principal</span> : null}
              </div>
              <div className="flex flex-col items-start gap-2">
                <label htmlFor="foto-principal-edicao" className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50">{imagemArquivo ? "Trocar selecao" : "Trocar foto principal"}</label>
                <input id="foto-principal-edicao" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImagemArquivo(event.target.files?.[0] ?? null)} />
                <p className="text-xs text-zinc-500">
                  {imagemArquivo ? imagemArquivo.name : "Selecione apenas quando quiser substituir a foto principal atual."}
                </p>
                {imagemArquivo ? (
                  <button type="button" onClick={() => setImagemArquivo(null)} className="rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Remover da selecao</button>
                ) : brinquedoAtual?.imagem_principal ? (
                  <button type="button" disabled={imagemAlterando === brinquedoAtual.imagem_principal.id} onClick={() => void removerImagem(brinquedoAtual.imagem_principal!.id)} className="rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Remover foto principal</button>
                ) : null}
              </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
              <p className="text-sm font-semibold text-zinc-900">Fotos adicionais</p>
              <p className="mt-1 text-xs text-zinc-500">
                Estas fotos aparecem somente na galeria da pagina de detalhe.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label htmlFor="fotos-adicionais-edicao" className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">Adicionar fotos</label>
                <input id="fotos-adicionais-edicao" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setImagensAdicionais(Array.from(event.target.files ?? []))} />
                <span className="text-xs text-zinc-500">{imagensAdicionais.length ? `${imagensAdicionais.length} foto(s) selecionada(s)` : "Selecione uma ou mais imagens"}</span>
              </div>

              {imagensAdicionaisPreview.length > 0 ? (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700">Novas fotos ainda nao salvas</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {imagensAdicionaisPreview.map(({ arquivo, url }) => (
                    <div key={`${arquivo.name}-${arquivo.lastModified}`} className="relative max-w-[160px] overflow-hidden rounded-lg border border-teal-200 bg-white p-1.5 shadow-sm">
                      <div className="relative aspect-square overflow-hidden rounded-md bg-zinc-50">
                        <Image src={url} alt={`Previa de ${arquivo.name}`} fill className="object-contain" />
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white">Nova</span>
                      </div>
                      <button type="button" onClick={() => removerFotoAdicionalSelecionada(arquivo)} className="mt-1.5 w-full rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Remover da selecao</button>
                    </div>
                  ))}
                  </div>
                </div>
              ) : null}

              {brinquedoAtual?.imagens.some((item) => !item.principal) ? (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Fotos salvas</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {brinquedoAtual.imagens.filter((item) => !item.principal).map((item) => {
                    const url = resolveMediaUrl(item.url);
                    return (
                      <div key={item.id} className="max-w-[160px] rounded-lg border border-zinc-200 bg-white p-1.5 shadow-sm">
                        <div className="relative aspect-square overflow-hidden rounded-md bg-zinc-50">
                          {url ? (
                            <Image src={url} alt={item.alt_text || brinquedoAtual.nome} fill className="object-contain" />
                          ) : null}
                        </div>
                        <span className="mt-1.5 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">Adicional</span>
                        <div className="mt-1.5 flex flex-col gap-1">
                          <button type="button" disabled={imagemAlterando === item.id} onClick={() => void definirImagemPrincipal(item.id)} className="rounded-md px-2 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50">Tornar principal</button>
                          <button
                            type="button"
                            disabled={imagemAlterando === item.id}
                            onClick={() => void removerImagem(item.id)}
                            className="rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              ) : <div className="mt-5 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center text-xs text-zinc-400">Nenhuma foto adicional salva.</div>}
            </div>

            {brinquedoEmEdicao ? (
              <div
                id="unidades-brinquedo"
                className="scroll-mt-6 rounded-lg border border-zinc-100 bg-zinc-50 p-4"
              >
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
                            <th className="px-3 py-2">Status da unidade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {unidades.map((unidade) => (
                            <tr key={unidade.id}>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-zinc-900">{unidade.codigo}</span>
                                  {unidade.dedicada_kit_festa ? (
                                    <Badge variant="warning">
                                      {unidade.kit_festa_nome
                                        ? `Reservada para ${unidade.kit_festa_nome}`
                                        : "Reservada para Kit Festa"}
                                    </Badge>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-zinc-600">
                                <Select
                                  aria-label={`Status da unidade ${unidade.codigo}`}
                                  value={unidade.status}
                                  options={STATUS_UNIDADE_OPTIONS}
                                  disabled={unidadeAlterandoStatus === unidade.id}
                                  onChange={(event) =>
                                    void alterarStatusUnidade(
                                      unidade,
                                      event.target.value as UnidadeBrinquedoStatus,
                                    )
                                  }
                                />
                              </td>
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
                  label="Exibir no catalogo"
                  checked={form.ativo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ativo: event.target.checked,
                    }))
                  }
                />
                <p className="text-xs text-zinc-500">
                  Para reservar ou alugar, altere o status da unidade fisica correspondente.
                </p>
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
        </div>
      ) : null}

      <section className="flex flex-col gap-5" aria-labelledby="lista-brinquedos-titulo">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,1.4fr)_minmax(200px,0.8fr)_minmax(200px,0.8fr)_auto] lg:items-end">
            <Input
              label="Buscar brinquedo"
              type="search"
              value={busca}
              placeholder="Digite o nome do brinquedo"
              onChange={(event) => {
                setBusca(event.target.value);
                setQuantidadeVisivel(QUANTIDADE_INICIAL);
              }}
            />
            <Select
              label="Categoria"
              value={categoriaFiltro}
              options={categoriasFiltroOptions}
              onChange={(event) => {
                setCategoriaFiltro(event.target.value);
                setQuantidadeVisivel(QUANTIDADE_INICIAL);
              }}
            />
            <Select
              label="Status"
              value={statusFiltro}
              options={STATUS_CATALOGO_OPTIONS}
              onChange={(event) => {
                setStatusFiltro(event.target.value as StatusCatalogoFiltro);
                setQuantidadeVisivel(QUANTIDADE_INICIAL);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!temFiltros}
              onClick={limparFiltros}
              className="h-[46px] whitespace-nowrap"
            >
              Limpar filtros
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4">
            <div>
              <h2 id="lista-brinquedos-titulo" className="text-base font-semibold text-zinc-900">
                Catálogo administrativo
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500" aria-live="polite">
                {brinquedosFiltrados.length} de {brinquedosOrdenados.length} brinquedo(s)
              </p>
            </div>
            {temFiltros ? (
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                Filtros ativos
              </span>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4" aria-label="Carregando catálogo de brinquedos">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-52 animate-pulse rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <div className="h-full rounded-xl bg-zinc-100" />
              </div>
            ))}
          </div>
        ) : brinquedosOrdenados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
            <p className="text-base font-semibold text-zinc-800">Nenhum brinquedo cadastrado</p>
            <p className="mt-2 text-sm text-zinc-500">
              Crie o primeiro brinquedo para começar a organizar o catálogo.
            </p>
            <Button type="button" size="sm" className="mt-5" onClick={abrirNovoBrinquedo}>
              Novo Brinquedo
            </Button>
          </div>
        ) : brinquedosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
            <p className="text-base font-semibold text-zinc-800">Nenhum resultado encontrado</p>
            <p className="mt-2 text-sm text-zinc-500">
              Tente outro nome, categoria ou status.
            </p>
            <Button type="button" size="sm" variant="outline" className="mt-5" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {brinquedosVisiveis.map((brinquedo) => {
              const imagemUrl = resolveMediaUrl(brinquedo.imagem_principal?.url);
              const statusAtual = statusAdministrativo(brinquedo);
              const estaAlterando = brinquedoAlterandoStatus === brinquedo.id;

              return (
                <article
                  key={brinquedo.id}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="grid gap-0 md:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_250px]">
                    <div className="relative min-h-48 overflow-hidden border-b border-zinc-100 bg-zinc-50 md:min-h-full md:border-b-0 md:border-r">
                      {imagemUrl ? (
                        <Image
                          src={imagemUrl}
                          alt={brinquedo.imagem_principal?.alt_text || brinquedo.nome}
                          fill
                          className="object-contain p-3"
                          sizes="(max-width: 768px) 100vw, 210px"
                        />
                      ) : (
                        <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-zinc-400">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm" aria-hidden="true">
                            ◇
                          </span>
                          <span className="text-xs font-medium">Sem imagem</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                            {brinquedo.categoria?.nome ?? "Sem categoria"}
                          </p>
                          <h3 className="mt-1 text-xl font-bold leading-tight text-zinc-900">
                            {brinquedo.nome}
                          </h3>
                        </div>
                        {statusAtual === "disponivel" ? (
                          <Badge variant="success">Disponível</Badge>
                        ) : statusAtual === "oculto" ? (
                          <Badge variant="default">Oculto</Badge>
                        ) : (
                          <Badge variant="warning">Alugado</Badge>
                        )}
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">
                        {brinquedo.descricao || "Sem descrição cadastrada."}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5">
                        <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Unidades fisicas</p>
                          <p className="mt-1 text-base font-bold text-zinc-900">
                            {brinquedo.total_unidades ?? brinquedo.quantidade_disponivel ?? 0}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {brinquedo.quantidade_disponivel ?? 0} avulsa(s)
                            {(brinquedo.unidades_dedicadas_kits ?? 0) > 0
                              ? ` · ${brinquedo.unidades_dedicadas_kits} em kit(s)`
                              : ""}
                          </p>
                        </div>
                        {[
                          ["Diária", brinquedo.preco_diaria],
                          ["3 dias", brinquedo.preco_3_dias],
                          ["15 dias", brinquedo.preco_15_dias],
                          ["30 dias", brinquedo.preco_30_dias],
                        ].filter(([, valor]) => valor && Number(valor) > 0).map(([label, valor]) => (
                          <div key={label} className="rounded-xl bg-zinc-50 px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
                            <p className="mt-1 whitespace-nowrap text-sm font-bold text-zinc-900">
                              {valor ? formatarMoeda(valor) : "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-4 border-t border-zinc-100 bg-zinc-50/60 p-4 md:col-start-2 xl:col-start-auto xl:border-l xl:border-t-0">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Ações</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1">
                          <Button type="button" size="sm" variant="outline" onClick={() => abrirEdicao(brinquedo)}>
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => abrirEdicao(brinquedo, "unidades-brinquedo")}
                          >
                            Unidades
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-200 pt-3 text-xs font-semibold">
                        {brinquedo.ativo !== false ? (
                          <button
                            type="button"
                            disabled={estaAlterando}
                            onClick={() => void handleAlternarStatusBrinquedo(brinquedo)}
                            className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50"
                          >
                            Ocultar
                          </button>
                        ) : null}
                        {brinquedo.ativo !== false ? (
                          <Link
                            href={`/brinquedos/${brinquedo.id}`}
                            target="_blank"
                            className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm text-teal-700 transition-colors hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                          >
                            Ver na loja
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          disabled={estaAlterando || brinquedoRemovendo === brinquedo.id}
                          onClick={() => void handleRemoverBrinquedo(brinquedo)}
                          className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                        >
                          {brinquedoRemovendo === brinquedo.id ? "Removendo..." : "Remover"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {quantidadeVisivel < brinquedosFiltrados.length ? (
              <div className="flex flex-col items-center gap-2 py-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuantidadeVisivel((atual) => atual + QUANTIDADE_INICIAL)}
                >
                  Carregar mais
                </Button>
                <span className="text-xs text-zinc-500">
                  Exibindo {brinquedosVisiveis.length} de {brinquedosFiltrados.length}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </section>
      <InlineCategoryModal
        isOpen={categoriaModalAberta}
        onClose={() => setCategoriaModalAberta(false)}
        onCreated={handleCategoriaCriada}
      />
    </div>
  );
}
