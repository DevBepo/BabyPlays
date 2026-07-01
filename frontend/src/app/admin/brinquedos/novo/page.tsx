"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/TextArea";
import { criarBrinquedo, listarCategorias, uploadImagemBrinquedo } from "@/services/catalogo";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type { CategoriaCatalogo } from "@/types/catalogo";

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

export default function NovoBrinquedo() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoriasLoading, setCategoriasLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors | undefined>();
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([]);

  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [precoDiaria, setPrecoDiaria] = useState("");
  const [preco15Dias, setPreco15Dias] = useState("");
  const [preco30Dias, setPreco30Dias] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [indisponivelCatalogo, setIndisponivelCatalogo] = useState(false);
  const [imagem, setImagem] = useState<File | null>(null);

  const categoriasOptions = categorias.map((categoria) => ({
    value: String(categoria.id),
    label: categoria.nome,
  }));

  useEffect(() => {
    let active = true;

    async function carregarCategorias() {
      setCategoriasLoading(true);
      setErro(null);

      try {
        const dados = await listarCategorias();

        if (active) {
          setCategorias(dados);
          setCategoriaId(dados[0] ? String(dados[0].id) : "");
        }
      } catch {
        if (active) {
          setErro("Nao foi possivel carregar as categorias cadastradas.");
        }
      } finally {
        if (active) {
          setCategoriasLoading(false);
        }
      }
    }

    void carregarCategorias();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErro(null);
    setFieldErrors(undefined);

    try {
      if (!categoriaId) {
        setErro("Cadastre uma categoria antes de criar brinquedos.");
        return;
      }

      const novoBrinquedo = await criarBrinquedo({
        nome,
        descricao,
        categoria: Number(categoriaId),
        preco_diaria: precoDiaria || null,
        preco_15_dias: preco15Dias || null,
        preco_30_dias: preco30Dias || null,
        ativo,
        indisponivel_catalogo: indisponivelCatalogo,
      });

      if (imagem && novoBrinquedo.id) {
        await uploadImagemBrinquedo(novoBrinquedo.id, imagem);
      }

      router.push("/admin/brinquedos");
    } catch (error: unknown) {
      if (isApiError(error)) {
        setErro(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setErro("Ocorreu um erro ao salvar o brinquedo ou a imagem.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Novo brinquedo</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Preencha os dados abaixo e anexe uma foto principal.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>

      {erro ? (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-red-600">
          {erro}
        </div>
      ) : null}

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <section>
            <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800">
              Foto principal
            </h2>
            <div className="flex w-full items-center justify-center">
              <label
                htmlFor="dropzone-file"
                className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
              >
                <div className="flex flex-col items-center justify-center pb-6 pt-5 text-zinc-500">
                  <svg
                    className="mb-4 h-8 w-8 text-zinc-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="mb-2 text-sm">
                    <span className="font-semibold">Clique para anexar</span> a imagem do brinquedo
                  </p>
                  {imagem ? (
                    <p className="mt-2 font-bold text-teal-600">Arquivo selecionado: {imagem.name}</p>
                  ) : null}
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(event) => setImagem(event.target.files?.[0] || null)}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800">
              Dados do brinquedo
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input
                  label="Nome *"
                  placeholder="Ex: Cadeira de Balanco Fisher Price"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  error={erroCampo(fieldErrors, "nome")}
                  required
                />
              </div>

              <Select
                label="Categoria *"
                options={categoriasOptions}
                value={categoriaId}
                onChange={(event) => setCategoriaId(event.target.value)}
                disabled={categoriasLoading || categoriasOptions.length === 0}
                error={erroCampo(fieldErrors, "categoria")}
                required
                placeholder={
                  categoriasLoading
                    ? "Carregando categorias..."
                    : categoriasOptions.length === 0
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
                placeholder="0.00"
                value={precoDiaria}
                onChange={(event) => setPrecoDiaria(event.target.value)}
                error={erroCampo(fieldErrors, "preco_diaria")}
              />

              <Input
                label="15 dias (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={preco15Dias}
                onChange={(event) => setPreco15Dias(event.target.value)}
                error={erroCampo(fieldErrors, "preco_15_dias")}
              />

              <Input
                label="30 dias (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={preco30Dias}
                onChange={(event) => setPreco30Dias(event.target.value)}
                error={erroCampo(fieldErrors, "preco_30_dias")}
              />
            </div>
          </section>

          <Textarea
            label="Descricao completa *"
            placeholder="Descreva as caracteristicas do brinquedo..."
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            error={erroCampo(fieldErrors, "descricao")}
            required
          />

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <Checkbox
              label="Exibir no catalogo"
              checked={ativo}
              onChange={(event) => setAtivo(event.target.checked)}
            />
            <div className="mt-3">
              <Checkbox
                label="Marcar brinquedo inteiro como alugado"
                checked={indisponivelCatalogo}
                onChange={(event) => setIndisponivelCatalogo(event.target.checked)}
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-4 border-t border-zinc-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading || categoriasLoading || categoriasOptions.length === 0}
            >
              Guardar brinquedo
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
