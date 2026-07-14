"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/TextArea";

import {
  atualizarCategoria,
  criarCategoria,
  excluirCategoria,
  listarCategorias,
} from "@/services/catalogo";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type { CategoriaCatalogo } from "@/types/catalogo";

const FORM_INICIAL = {
  nome: "",
  descricao: "",
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

function slugSugerido(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoriasAdminPage() {
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors | undefined>();

  const [form, setForm] = useState(FORM_INICIAL);
  const [categoriaEditando, setCategoriaEditando] = useState<CategoriaCatalogo | null>(null);
  const [categoriaExcluindoId, setCategoriaExcluindoId] = useState<number | null>(null);

  const categoriasOrdenadas = useMemo(
    () => [...categorias].sort((a, b) => a.nome.localeCompare(b.nome)),
    [categorias],
  );

  useEffect(() => {
    let active = true;

    async function carregarCategoriasInicial() {
      setLoading(true);
      setErro(null);

      try {
        const dados = await listarCategorias();
        if (active) {
          setCategorias(dados);
        }
      } catch (error) {
        if (active) {
          setErro(
            isApiError(error)
              ? error.message
              : "Nao foi possivel carregar as categorias.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarCategoriasInicial();

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
      const payload = {
        nome: form.nome,
        slug: categoriaEditando?.slug ?? slugSugerido(form.nome),
        descricao: form.descricao,
        ativo: form.ativo,
        ordem: categoriaEditando?.ordem ?? 0,
      };

      if (categoriaEditando) {
        const categoriaAtualizada = await atualizarCategoria(categoriaEditando.id, payload);
        setCategorias((atuais) =>
          atuais.map((categoria) =>
            categoria.id === categoriaAtualizada.id ? categoriaAtualizada : categoria,
          ),
        );
        setCategoriaEditando(null);
        setSucesso("Categoria atualizada com sucesso.");
      } else {
        const novaCategoria = await criarCategoria(payload);
        setCategorias((atuais) => [novaCategoria, ...atuais]);
        setSucesso("Categoria criada com sucesso.");
      }

      setForm(FORM_INICIAL);
    } catch (error) {
      if (isApiError(error)) {
        setErro(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setErro("Nao foi possivel salvar a categoria.");
      }
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(categoria: CategoriaCatalogo) {
    setErro(null);
    setSucesso(null);
    try {
      const atualizada = await atualizarCategoria(categoria.id, {
        ativo: !(categoria.ativo ?? true),
      });

      setCategorias((atuais) =>
        atuais.map((item) => (item.id === atualizada.id ? atualizada : item)),
      );
      setSucesso(
        atualizada.ativo
          ? "Categoria ativada com sucesso."
          : "Categoria desativada com sucesso.",
      );
    } catch (error) {
      setErro(
        isApiError(error)
          ? error.message
          : "Nao foi possivel atualizar a categoria.",
      );
    }
  }

  function iniciarEdicao(categoria: CategoriaCatalogo) {
    setErro(null);
    setSucesso(null);
    setFieldErrors(undefined);
    setCategoriaEditando(categoria);
    setForm({
      nome: categoria.nome,
      descricao: categoria.descricao ?? "",
      ativo: categoria.ativo !== false,
    });
  }

  function cancelarEdicao() {
    setCategoriaEditando(null);
    setForm(FORM_INICIAL);
    setFieldErrors(undefined);
    setErro(null);
  }

  async function handleExcluir(categoria: CategoriaCatalogo) {
    const confirmar = window.confirm(
      `Excluir a categoria "${categoria.nome}"? Esta acao nao pode ser desfeita.`,
    );

    if (!confirmar) {
      return;
    }

    setCategoriaExcluindoId(categoria.id);
    setErro(null);
    setSucesso(null);

    try {
      await excluirCategoria(categoria.id);
      setCategorias((atuais) => atuais.filter((item) => item.id !== categoria.id));
      if (categoriaEditando?.id === categoria.id) {
        cancelarEdicao();
      }
      setSucesso("Categoria excluida com sucesso.");
    } catch (error) {
      setErro(
        isApiError(error)
          ? error.message
          : "Nao foi possivel excluir a categoria. Verifique se ela esta em uso.",
      );
    } finally {
      setCategoriaExcluindoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Categorias</h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            Cadastre categorias reais para usar no formulario de brinquedos.
          </p>
        </div>
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

      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            {categoriaEditando ? "Editar categoria" : "Nova categoria"}
          </h2>
          {categoriaEditando ? (
            <Button className="w-full sm:w-auto" type="button" variant="ghost" size="sm" onClick={cancelarEdicao}>
              Cancelar edicao
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome *"
              value={form.nome}
              onChange={(event) =>
                setForm((atual) => ({ ...atual, nome: event.target.value }))
              }
              error={erroCampo(fieldErrors, "nome") || erroCampo(fieldErrors, "slug")}
              required
            />
            <div className="flex items-center pt-2 sm:pt-7">
              <Checkbox
                label="Ativa"
                checked={form.ativo}
                onChange={(event) => setForm((atual) => ({ ...atual, ativo: event.target.checked }))}
              />
            </div>
          </div>
          
          <Textarea
            label="Descricao"
            value={form.descricao}
            onChange={(event) =>
              setForm((atual) => ({ ...atual, descricao: event.target.value }))
            }
            error={erroCampo(fieldErrors, "descricao")}
            rows={4}
            className="min-h-[112px] max-h-[280px] leading-6"
          />

          <div className="flex justify-end">
            <Button className="w-full sm:w-auto" type="submit" loading={salvando}>
              {categoriaEditando ? "Atualizar categoria" : "Salvar categoria"}
            </Button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Categorias cadastradas</h2>
          <span className="text-sm text-zinc-500">{categoriasOrdenadas.length} categoria(s)</span>
        </div>

        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
            Carregando categorias...
          </div>
        ) : categoriasOrdenadas.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            Nenhuma categoria cadastrada.
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Nome</Th>
                <Th>Status</Th>
                <Th>Descrição</Th>
                <Th className="text-right">Ações</Th>
              </Tr>
            </Thead>
            <Tbody>
              {categoriasOrdenadas.map((categoria) => (
                <Tr key={categoria.id}>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-900">{categoria.nome}</span>
                      <span className="text-xs text-zinc-500 font-mono">{categoria.slug}</span>
                    </div>
                  </Td>
                  <Td>
                    {categoria.ativo ? (
                      <Badge variant="success">Ativa</Badge>
                    ) : (
                      <Badge variant="default">Inativa</Badge>
                    )}
                  </Td>
                  <Td className="max-w-xs whitespace-normal text-sm text-zinc-600">
                    {categoria.descricao || "-"}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap sm:flex-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => iniciarEdicao(categoria)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={categoria.ativo ? "outline" : "secondary"}
                        onClick={() => void alternarAtivo(categoria)}
                      >
                        {categoria.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        loading={categoriaExcluindoId === categoria.id}
                        onClick={() => void handleExcluir(categoria)}
                      >
                        Excluir
                      </Button>
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