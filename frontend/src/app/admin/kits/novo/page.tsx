"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/TextArea";
import { criarAdminKitFesta, uploadImagemAdminKitFesta } from "@/services/adminKits";
import type { ApiError, ApiFieldErrors } from "@/types/api";

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

export default function NovoKitFestaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors | undefined>();

  const [nome, setNome] = useState("");
  const [precoDiaria, setPrecoDiaria] = useState("");
  const [preco15Dias, setPreco15Dias] = useState("");
  const [preco30Dias, setPreco30Dias] = useState("");
  const [ordem, setOrdem] = useState("0");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErro(null);
    setFieldErrors(undefined);

    try {
      const kitCriado = await criarAdminKitFesta({
        nome,
        descricao,
        preco_diaria: precoDiaria || null,
        preco_15_dias: preco15Dias || null,
        preco_30_dias: preco30Dias || null,
        ativo,
        ordem: Number(ordem || 0),
      });

      if (imagemArquivo) {
        await uploadImagemAdminKitFesta(kitCriado.id, imagemArquivo);
      }

      router.push("/admin/kits");
    } catch (error: unknown) {
      if (isApiError(error)) {
        setErro(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setErro("Ocorreu um erro ao salvar o kit festa.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Novo kit festa</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Preencha os dados abaixo para cadastrar um pacote pronto.
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
              Dados do kit festa
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input
                  label="Nome *"
                  placeholder="Ex: Kit Festa Safari"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
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

              <Input
                label="Ordem de exibicao"
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={ordem}
                onChange={(event) => setOrdem(event.target.value)}
                error={erroCampo(fieldErrors, "ordem")}
              />
            </div>
          </section>

          <Textarea
            label="Descricao completa *"
            placeholder="Descreva o tema, ocasiao indicada e principais itens do kit..."
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            error={erroCampo(fieldErrors, "descricao")}
            required
          />

          <section>
            <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800">
              Imagem do kit
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="h-32 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                {imagemPreviewUrl ? (
                  <img
                    src={imagemPreviewUrl}
                    alt="Previa da imagem selecionada"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-400">
                    Sem imagem
                  </div>
                )}
              </div>
              <Input
                label="Arquivo de imagem"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setImagemArquivo(event.target.files?.[0] ?? null)
                }
              />
            </div>
          </section>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <div className="flex flex-col gap-3">
              <Checkbox
                label="Ativo no catalogo"
                checked={ativo}
                onChange={(event) => setAtivo(event.target.checked)}
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-4 border-t border-zinc-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={loading}>
              Guardar kit festa
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
