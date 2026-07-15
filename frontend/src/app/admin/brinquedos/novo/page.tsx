"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { InlineCategoryModal } from "@/components/admin/InlineCategoryModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/TextArea";
import { criarBrinquedo, listarCategorias, uploadImagensBrinquedo } from "@/services/catalogo";
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
  const [categoriaModalAberta, setCategoriaModalAberta] = useState(false);

  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [precoDiaria, setPrecoDiaria] = useState("");
  const [preco3Dias, setPreco3Dias] = useState("");
  const [preco15Dias, setPreco15Dias] = useState("");
  const [preco30Dias, setPreco30Dias] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [indisponivelCatalogo, setIndisponivelCatalogo] = useState(false);
  const [imagem, setImagem] = useState<File | null>(null);
  const [imagensAdicionais, setImagensAdicionais] = useState<File[]>([]);
  const imagemPreviewUrl = useMemo(
    () => (imagem ? URL.createObjectURL(imagem) : null),
    [imagem],
  );
  const previewsAdicionais = useMemo(
    () => imagensAdicionais.map((arquivo) => ({
      arquivo,
      url: URL.createObjectURL(arquivo),
    })),
    [imagensAdicionais],
  );

  useEffect(() => {
    return () => previewsAdicionais.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [previewsAdicionais]);

  useEffect(() => {
    return () => {
      if (imagemPreviewUrl) URL.revokeObjectURL(imagemPreviewUrl);
    };
  }, [imagemPreviewUrl]);

  function removerFotoAdicionalSelecionada(arquivo: File) {
    setImagensAdicionais((atuais) => atuais.filter((item) => item !== arquivo));
  }

  const categoriasOptions = categorias.map((categoria) => ({
    value: String(categoria.id),
    label: categoria.nome,
  }));

  function handleCategoriaCriada(categoria: CategoriaCatalogo) {
    setCategorias((atuais) =>
      [...atuais.filter((item) => item.id !== categoria.id), categoria].sort((a, b) =>
        a.nome.localeCompare(b.nome),
      ),
    );
    setCategoriaId(String(categoria.id));
  }

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
        preco_3_dias: preco3Dias || null,
        preco_15_dias: preco15Dias || null,
        preco_30_dias: preco30Dias || null,
        ativo,
        indisponivel_catalogo: indisponivelCatalogo,
      });

      const arquivos = imagem ? [imagem, ...imagensAdicionais] : imagensAdicionais;
      if (arquivos.length > 0 && novoBrinquedo.id) {
        await uploadImagensBrinquedo(novoBrinquedo.id, arquivos, Boolean(imagem));
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
    <div className="w-full max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Novo brinquedo</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Preencha os dados abaixo e anexe uma foto principal.
          </p>
        </div>
        <Button className="w-full sm:w-auto" variant="outline" onClick={() => router.back()}>
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
          <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
            <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800">
              Imagens do brinquedo
            </h2>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Foto principal</p>
              <p className="mt-1 text-xs text-zinc-500">Usada nos cards e na pagina principal.</p>
              <label
                htmlFor="foto-principal-novo"
                className="relative mt-3 flex aspect-square w-full max-w-[280px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 hover:border-teal-400"
              >
                {imagemPreviewUrl ? (
                  <Image src={imagemPreviewUrl} alt="Previa da foto principal" fill className="object-contain p-2" />
                ) : (
                <div className="flex flex-col items-center justify-center px-4 text-center text-zinc-500">
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
                </div>
                )}
                <span className="absolute left-2 top-2 rounded-full bg-[#803233] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">Principal</span>
                <input
                  id="foto-principal-novo"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(event) => setImagem(event.target.files?.[0] || null)}
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded-md border border-zinc-200 bg-white px-3 py-2 font-semibold text-zinc-700">{imagem ? "Trocar foto" : "Selecionar foto"}</span>
                {imagem ? <span className="max-w-full truncate">{imagem.name}</span> : null}
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-5">
            <h3 className="text-sm font-semibold text-zinc-900">Fotos adicionais</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Aparecem somente na galeria da pagina de detalhe.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="fotos-adicionais-novo" className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">Adicionar fotos</label>
              <input id="fotos-adicionais-novo" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setImagensAdicionais(Array.from(event.target.files ?? []))} />
              <span className="text-xs text-zinc-500">{imagensAdicionais.length ? `${imagensAdicionais.length} foto(s) selecionada(s)` : "Selecione uma ou mais imagens"}</span>
            </div>
            {previewsAdicionais.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {previewsAdicionais.map(({ arquivo, url }) => (
                  <div key={`${arquivo.name}-${arquivo.lastModified}`} className="relative max-w-[160px] overflow-hidden rounded-lg border border-teal-200 bg-white p-1.5 shadow-sm">
                    <div className="relative aspect-square overflow-hidden rounded-md bg-zinc-50">
                      <Image src={url} alt={`Previa de ${arquivo.name}`} fill className="object-contain" />
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white">Nova</span>
                    </div>
                    <button type="button" onClick={() => removerFotoAdicionalSelecionada(arquivo)} className="mt-1.5 w-full rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Remover da selecao</button>
                  </div>
                ))}
              </div>
            ) : <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center text-xs text-zinc-400">Nenhuma foto adicional selecionada.</div>}
            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800">
              Informacoes basicas
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Nome *"
                placeholder="Ex: Cadeira de Balanco Fisher Price"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                error={erroCampo(fieldErrors, "nome")}
                required
              />

              <div className="flex flex-col gap-2">
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
                placeholder="0.00"
                value={precoDiaria}
                onChange={(event) => setPrecoDiaria(event.target.value)}
                error={erroCampo(fieldErrors, "preco_diaria")}
              />

              <Input
                label="3 dias (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Deixe vazio se nao oferecer"
                value={preco3Dias}
                onChange={(event) => setPreco3Dias(event.target.value)}
                error={erroCampo(fieldErrors, "preco_3_dias")}
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
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
          <Textarea
            label="Descricao do brinquedo *"
            placeholder="Explique o brinquedo, a idade recomendada e seus principais beneficios."
            rows={4}
            className="min-h-[112px] max-h-[320px] leading-6"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            error={erroCampo(fieldErrors, "descricao")}
            required
          />
          <p className="mt-2 text-xs leading-5 text-zinc-500">Use uma descricao curta e clara para explicar o brinquedo, idade recomendada e principais beneficios.</p>
          </section>

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

          <div className="mt-2 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-full sm:w-auto"
              loading={loading}
              disabled={loading || categoriasLoading || categoriasOptions.length === 0}
            >
              Guardar brinquedo
            </Button>
          </div>
        </form>
      </Card>
      <InlineCategoryModal
        isOpen={categoriaModalAberta}
        onClose={() => setCategoriaModalAberta(false)}
        onCreated={handleCategoriaCriada}
      />
    </div>
  );
}
