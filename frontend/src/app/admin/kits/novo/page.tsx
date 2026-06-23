"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/TextArea";
import { criarAdminKitFesta, uploadImagemAdminKitFesta } from "@/services/adminKits";
import { listarBrinquedos, listarUnidadesBrinquedo } from "@/services/catalogo";
import { resolveMediaUrl } from "@/lib/media-url";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type { BrinquedoCatalogo, UnidadeBrinquedoAdmin } from "@/types/catalogo";

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

  // Dados do Kit
  const [nome, setNome] = useState("");
  const [precoDiaria, setPrecoDiaria] = useState("");
  const [preco15Dias, setPreco15Dias] = useState("");
  const [preco30Dias, setPreco30Dias] = useState("");
  const [ordem, setOrdem] = useState("0");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);

  // Estados para os Brinquedos do Kit
  const [brinquedosDisponiveis, setBrinquedosDisponiveis] = useState<BrinquedoCatalogo[]>([]);
  const [carregandoBrinquedos, setCarregandoBrinquedos] = useState(true);
  const [quantidadesSelecionadas, setQuantidadesSelecionadas] = useState<Record<number, number>>({});
  const [unidadesPorBrinquedo, setUnidadesPorBrinquedo] = useState<Record<number, UnidadeBrinquedoAdmin[]>>({});
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState<Record<number, number[]>>({});

  const imagemPreviewUrl = useMemo(
    () => (imagemArquivo ? URL.createObjectURL(imagemArquivo) : null),
    [imagemArquivo],
  );

  useEffect(() => {
    return () => {
      if (imagemPreviewUrl) URL.revokeObjectURL(imagemPreviewUrl);
    };
  }, [imagemPreviewUrl]);

  // Busca os brinquedos cadastrados no backend ao carregar a página
  useEffect(() => {
    async function carregarBrinquedos() {
      try {
        const dados = await listarBrinquedos();
        // Se a API retornar objeto com results (paginação), pega o array, senão pega direto
        const lista = dados;
        setBrinquedosDisponiveis(lista);
        const pares = await Promise.all(
          lista.map(async (brinquedo: BrinquedoCatalogo) => [brinquedo.id, await listarUnidadesBrinquedo(brinquedo.id)] as const),
        );
        setUnidadesPorBrinquedo(Object.fromEntries(pares));
      } catch (err) {
        console.error("Erro ao carregar brinquedos:", err);
      } finally {
        setCarregandoBrinquedos(false);
      }
    }
    carregarBrinquedos();
  }, []);

  const alterarQuantidade = (id: number, delta: number) => {
    const atuais = unidadesSelecionadas[id] || [];
    const disponiveis = (unidadesPorBrinquedo[id] || []).filter(
      (unidade) => unidade.status === "disponivel" && !atuais.includes(unidade.id),
    );
    const novas = delta > 0
      ? (disponiveis[0] ? [...atuais, disponiveis[0].id] : atuais)
      : atuais.slice(0, -1);
    setUnidadesSelecionadas((prev) => ({ ...prev, [id]: novas }));
    setQuantidadesSelecionadas((prev) => {
      const proximo = { ...prev };
      if (novas.length) proximo[id] = novas.length;
      else delete proximo[id];
      return proximo;
    });
  };

  const alternarUnidade = (brinquedoId: number, unidadeId: number) => {
    const atuais = unidadesSelecionadas[brinquedoId] || [];
    const novas = atuais.includes(unidadeId)
      ? atuais.filter((id) => id !== unidadeId)
      : [...atuais, unidadeId];
    setUnidadesSelecionadas((prev) => ({ ...prev, [brinquedoId]: novas }));
    setQuantidadesSelecionadas((prev) => {
      const proximo = { ...prev };
      if (novas.length) proximo[brinquedoId] = novas.length;
      else delete proximo[brinquedoId];
      return proximo;
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErro(null);
    setFieldErrors(undefined);

    // Formata os brinquedos selecionados para enviar ao backend
    const itensParaEnviar = Object.entries(quantidadesSelecionadas).map(([id, qtd]) => ({
      brinquedo_id: Number(id),
      quantidade: qtd,
      unidade_ids: unidadesSelecionadas[Number(id)] || [],
    }));

    if (itensParaEnviar.length === 0) {
      setErro("Você precisa selecionar pelo menos um brinquedo para compor o Kit Festa.");
      setLoading(false);
      return;
    }

    try {
      // Usamos "as any" aqui caso o seu types/adminKits.ts ainda não tenha a propriedade itens_enviados
      const kitCriado = await criarAdminKitFesta({
        nome,
        descricao,
        preco_diaria: precoDiaria || null,
        preco_15_dias: preco15Dias || null,
        preco_30_dias: preco30Dias || null,
        ativo,
        ordem: Number(ordem || 0),
        itens_enviados: itensParaEnviar, 
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
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Novo kit festa</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Selecione os brinquedos e defina os dados do pacote.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>

      {erro ? (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-red-600 font-medium">
          {erro}
        </div>
      ) : null}

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          
          {/* SESSÃO 1: DADOS BÁSICOS */}
          <section>
            <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800">
              Dados do kit festa
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input label="Nome *" placeholder="Ex: Kit Festa Safari" value={nome} onChange={(e) => setNome(e.target.value)} error={erroCampo(fieldErrors, "nome")} required />
              </div>
              <Input label="Diaria (R$)" type="number" step="0.01" min="0" value={precoDiaria} onChange={(e) => setPrecoDiaria(e.target.value)} error={erroCampo(fieldErrors, "preco_diaria")} />
              <Input label="15 dias (R$)" type="number" step="0.01" min="0" value={preco15Dias} onChange={(e) => setPreco15Dias(e.target.value)} error={erroCampo(fieldErrors, "preco_15_dias")} />
              <Input label="30 dias (R$)" type="number" step="0.01" min="0" value={preco30Dias} onChange={(e) => setPreco30Dias(e.target.value)} error={erroCampo(fieldErrors, "preco_30_dias")} />
              <Input label="Ordem de exibicao" type="number" step="1" min="0" value={ordem} onChange={(e) => setOrdem(e.target.value)} error={erroCampo(fieldErrors, "ordem")} />
            </div>
            <div className="mt-6">
              <Textarea label="Descricao completa *" placeholder="Descreva o tema, ocasiao indicada e principais itens..." value={descricao} onChange={(e) => setDescricao(e.target.value)} error={erroCampo(fieldErrors, "descricao")} required />
            </div>
          </section>

          {/* SESSÃO 2: SELEÇÃO DE BRINQUEDOS */}
          <section>
            <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800 flex justify-between items-center">
              Composição do Kit *
              <span className="text-sm bg-teal-50 text-teal-700 px-3 py-1 rounded-full">
                {Object.values(quantidadesSelecionadas).reduce((a, b) => a + b, 0)} itens selecionados
              </span>
            </h2>

            {carregandoBrinquedos ? (
              <p className="text-zinc-500 text-sm py-4">Buscando brinquedos cadastrados...</p>
            ) : brinquedosDisponiveis.length === 0 ? (
              <div className="p-6 border border-dashed border-zinc-300 rounded-lg text-center bg-zinc-50">
                <p className="text-zinc-600 font-medium">Nenhum brinquedo encontrado.</p>
                <p className="text-sm text-zinc-500 mt-1">Você precisa cadastrar brinquedos antes de montar um kit.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2">
                {brinquedosDisponiveis.map((brinquedo) => {
                  const qtd = quantidadesSelecionadas[brinquedo.id] || 0;
                  const imgUrl = brinquedo.imagem_principal?.url ? resolveMediaUrl(brinquedo.imagem_principal.url) : null;
                  
                  return (
                    <div key={brinquedo.id} className={`flex items-center gap-4 p-3 border rounded-xl bg-white transition-colors ${qtd > 0 ? 'border-teal-500 ring-1 ring-teal-500' : 'border-zinc-200'}`}>
                      <div className="w-16 h-16 bg-zinc-100 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center border border-zinc-200">
                        {imgUrl ? <img src={imgUrl} alt={brinquedo.nome} className="w-full h-full object-cover" /> : <span className="text-[10px] text-zinc-400">Sem Img</span>}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-800 line-clamp-2 leading-tight">{brinquedo.nome}</p>
                        
                        <div className="mt-2 flex items-center gap-3">
                          <button type="button" onClick={() => alterarQuantidade(brinquedo.id, -1)} className="w-7 h-7 bg-zinc-100 rounded flex items-center justify-center font-bold text-zinc-600 hover:bg-zinc-200">-</button>
                          <span className="text-sm font-bold text-zinc-900 w-4 text-center">{qtd}</span>
                          <button type="button" onClick={() => alterarQuantidade(brinquedo.id, 1)} className="w-7 h-7 bg-teal-50 rounded flex items-center justify-center font-bold text-teal-700 hover:bg-teal-100">+</button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(unidadesPorBrinquedo[brinquedo.id] || []).map((unidade) => (
                            <label key={unidade.id} className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[10px] text-zinc-600">
                              <input
                                type="checkbox"
                                checked={(unidadesSelecionadas[brinquedo.id] || []).includes(unidade.id)}
                                disabled={unidade.status !== "disponivel"}
                                onChange={() => alternarUnidade(brinquedo.id, unidade.id)}
                              />
                              {unidade.codigo}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SESSÃO 3: IMAGEM DO KIT E ATIVO */}
          <section>
            <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800">
              Imagem do kit
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="h-32 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                {imagemPreviewUrl ? (
                  <img src={imagemPreviewUrl} alt="Previa da imagem selecionada" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-400">Sem imagem</div>
                )}
              </div>
              <Input label="Arquivo de imagem" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImagemArquivo(e.target.files?.[0] ?? null)} />
            </div>
          </section>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <Checkbox label="Ativo no catalogo" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          </div>

          <div className="mt-2 flex items-center justify-end gap-4 border-t border-zinc-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={loading}>Guardar kit festa</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
