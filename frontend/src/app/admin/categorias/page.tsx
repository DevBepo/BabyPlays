"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/TextArea";
import { atualizarCategoria, criarCategoria, listarCategorias } from "@/services/catalogo";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type { CategoriaCatalogo } from "@/types/catalogo";

const FORM_INICIAL = {
  nome: "",
  slug: "",
  descricao: "",
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
  const [slugEditado, setSlugEditado] = useState(false);

  const categoriasOrdenadas = useMemo(
    () =>
      [...categorias].sort(
        (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome),
      ),
    [categorias],
  );

  async function carregarCategorias() {
    setLoading(true);
    setErro(null);

    try {
      setCategorias(await listarCategorias());
    } catch (error) {
      setErro(
        isApiError(error)
          ? error.message
          : "Nao foi possivel carregar as categorias.",
      );
    } finally {
      setLoading(false);
    }
  }

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
      const novaCategoria = await criarCategoria({
        nome: form.nome,
        slug: form.slug || slugSugerido(form.nome),
        descricao: form.descricao,
        ativo: form.ativo,
        ordem: Number(form.ordem || 0),
      });

      setCategorias((atuais) => [novaCategoria, ...atuais]);
      setForm(FORM_INICIAL);
      setSlugEditado(false);
      setSucesso("Categoria criada com sucesso.");
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Categorias</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Cadastre categorias reais para usar no formulario de brinquedos.
          </p>
        </div>
        <Button variant="outline" onClick={() => void carregarCategorias()} disabled={loading}>
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
        <h2 className="text-lg font-semibold text-zinc-900">Nova categoria</h2>
        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="Nome *"
            value={form.nome}
            onChange={(event) => {
              const nome = event.target.value;
              setForm((atual) => ({
                ...atual,
                nome,
                slug: slugEditado ? atual.slug : slugSugerido(nome),
              }));
            }}
            error={erroCampo(fieldErrors, "nome")}
            required
          />

          <Input
            label="Slug *"
            value={form.slug}
            onChange={(event) => {
              setSlugEditado(true);
              setForm((atual) => ({ ...atual, slug: event.target.value }));
            }}
            error={erroCampo(fieldErrors, "slug")}
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

          <div className="flex items-center pt-7">
            <Checkbox
              label="Ativa"
              checked={form.ativo}
              onChange={(event) => setForm((atual) => ({ ...atual, ativo: event.target.checked }))}
            />
          </div>

          <div className="md:col-span-2">
            <Textarea
              label="Descricao"
              value={form.descricao}
              onChange={(event) =>
                setForm((atual) => ({ ...atual, descricao: event.target.value }))
              }
              error={erroCampo(fieldErrors, "descricao")}
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" loading={salvando}>
              Salvar categoria
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
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
            Nenhuma categoria cadastrada ainda.
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Nome</Th>
                <Th>Slug</Th>
                <Th>Status</Th>
                <Th>Ordem</Th>
                <Th className="text-right">Acao</Th>
              </Tr>
            </Thead>
            <Tbody>
              {categoriasOrdenadas.map((categoria) => (
                <Tr key={categoria.id}>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-900">{categoria.nome}</span>
                      <span className="mt-0.5 max-w-md truncate text-xs text-zinc-400">
                        {categoria.descricao || "Sem descricao"}
                      </span>
                    </div>
                  </Td>
                  <Td className="font-mono text-xs text-zinc-600">{categoria.slug}</Td>
                  <Td>
                    {categoria.ativo !== false ? (
                      <Badge variant="success">Ativa</Badge>
                    ) : (
                      <Badge variant="default">Inativa</Badge>
                    )}
                  </Td>
                  <Td>{categoria.ordem ?? 0}</Td>
                  <Td className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant={categoria.ativo !== false ? "outline" : "secondary"}
                      onClick={() => void alternarAtivo(categoria)}
                    >
                      {categoria.ativo !== false ? "Desativar" : "Ativar"}
                    </Button>
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
