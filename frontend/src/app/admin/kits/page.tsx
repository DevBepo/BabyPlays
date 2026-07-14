"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
import { listarBrinquedos, listarUnidadesBrinquedo } from "@/services/catalogo";
import { resolveMediaUrl } from "@/lib/media-url";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type { AdminKitFesta } from "@/types/adminKits";
import type { BrinquedoCatalogo, UnidadeBrinquedoAdmin } from "@/types/catalogo";

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
  if (Number.isNaN(numero)) return "R$ 0,00";
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function resumirItens(kit: AdminKitFesta): string {
  if (!kit.itens.length) return "Composicao ainda nao cadastrada";
  return kit.itens.map((item) => `${item.quantidade}x ${item.brinquedo.nome}`).join(", ");
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

  const [brinquedosDisponiveis, setBrinquedosDisponiveis] = useState<BrinquedoCatalogo[]>([]);
  const [carregandoBrinquedos, setCarregandoBrinquedos] = useState(false);
  const [quantidadesSelecionadas, setQuantidadesSelecionadas] = useState<Record<number, number>>({});
  const [unidadesPorBrinquedo, setUnidadesPorBrinquedo] = useState<Record<number, UnidadeBrinquedoAdmin[]>>({});
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState<Record<number, number[]>>({});

  const kitsOrdenados = useMemo(
    () => [...kits].sort((a, b) => a.nome.localeCompare(b.nome)),
    [kits],
  );

  const imagemPreviewUrl = useMemo(
    () => (imagemArquivo ? URL.createObjectURL(imagemArquivo) : null),
    [imagemArquivo],
  );

  async function carregarKitsFesta() {
    setLoading(true); setErro(null);
    try {
      setKits(await listarAdminKitsFesta());
    } catch (error) {
      setErro(isApiError(error) ? error.message : "Nao foi possivel carregar os kits festa.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function carregarKitsInicial() {
      setLoading(true); setErro(null);
      try {
        const dados = await listarAdminKitsFesta();
        if (active) setKits(dados);
      } catch (error) {
        if (active) setErro(isApiError(error) ? error.message : "Nao foi possivel carregar.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void carregarKitsInicial();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    return () => { if (imagemPreviewUrl) URL.revokeObjectURL(imagemPreviewUrl); };
  }, [imagemPreviewUrl]);

  async function abrirEdicao(kit: AdminKitFesta) {
    setForm(formFromKit(kit));
    setKitEmEdicao(kit.id);
    setImagemArquivo(null);
    setRemoverImagemAtual(false);
    setFieldErrors(undefined);
    setErro(null);
    setSucesso(null);
    setFormAberto(true);

    setCarregandoBrinquedos(true);
    try {
      const todos = await listarBrinquedos();
      const lista = todos;
      setBrinquedosDisponiveis(lista);

      const pares = await Promise.all(
        lista.map(async (brinquedo: BrinquedoCatalogo) => [brinquedo.id, await listarUnidadesBrinquedo(brinquedo.id)] as const),
      );
      setUnidadesPorBrinquedo(Object.fromEntries(pares));
      
      const mapQtd: Record<number, number> = {};
      const mapUnidades: Record<number, number[]> = {};

      kit.itens.forEach(item => {
        if (item.brinquedo && item.brinquedo.id) {
          mapQtd[item.brinquedo.id] = item.quantidade;
          mapUnidades[item.brinquedo.id] = item.unidades_dedicadas?.map((unidade) => unidade.id) || [];
        }
      });
      setQuantidadesSelecionadas(mapQtd);
      setUnidadesSelecionadas(mapUnidades);
    } catch (err) {
      console.error("Erro ao carregar brinquedos na edi o", err);
    } finally {
      setCarregandoBrinquedos(false);
    }
  }

  function fecharFormulario() {
    setFormAberto(false);
    setKitEmEdicao(null);
    setForm(initialForm);
    setImagemArquivo(null);
    setRemoverImagemAtual(false);
    setFieldErrors(undefined);
  }

  const handleIncrementar = (id: number) => {
    const atuais = unidadesSelecionadas[id] || [];
    const proxima = (unidadesPorBrinquedo[id] || []).find(
      (unidade) => unidade.status === "disponivel" && !atuais.includes(unidade.id),
    );
    if (!proxima) return;
    const novas = [...atuais, proxima.id];
    setUnidadesSelecionadas((prev) => ({ ...prev, [id]: novas }));
    setQuantidadesSelecionadas((prev) => ({ ...prev, [id]: novas.length }));
  };

  const handleDecrementar = (id: number) => {
    const novas = (unidadesSelecionadas[id] || []).slice(0, -1);
    setUnidadesSelecionadas((prev) => ({ ...prev, [id]: novas }));
    setQuantidadesSelecionadas(prev => {
      const novo = { ...prev };
      if (novas.length) novo[id] = novas.length;
      else delete novo[id];
      return novo;
    });
  };

  const alternarUnidade = (brinquedoId: number, unidadeId: number) => {
    const atuais = unidadesSelecionadas[brinquedoId] || [];
    const novas = atuais.includes(unidadeId) ? atuais.filter((id) => id !== unidadeId) : [...atuais, unidadeId];
    setUnidadesSelecionadas((prev) => ({ ...prev, [brinquedoId]: novas }));
    setQuantidadesSelecionadas((prev) => {
      const novo = { ...prev };
      if (novas.length) novo[brinquedoId] = novas.length;
      else delete novo[brinquedoId];
      return novo;
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true); setErro(null); setSucesso(null); setFieldErrors(undefined);

    const itensParaEnviar = Object.entries(quantidadesSelecionadas)
      .filter(([, qtd]) => qtd > 0)
      .map(([id, qtd]) => ({ brinquedo_id: parseInt(id), quantidade: qtd, unidade_ids: unidadesSelecionadas[parseInt(id)] || [] }));

    const payload = {
      nome: form.nome,
      descricao: form.descricao,
      preco_diaria: form.preco_diaria || null,
      preco_15_dias: form.preco_15_dias || null,
      preco_30_dias: form.preco_30_dias || null,
      ativo: form.ativo,
      ordem: Number(form.ordem || 0),
      itens_enviados: itensParaEnviar,
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
    if (!window.confirm(`Remover "${kit.nome}" do catalogo?`)) return;
    setKitRemovendo(kit.id); setErro(null); setSucesso(null);
    try {
      const resultado = await excluirAdminKitFesta(kit.id);
      setSucesso(resultado.detail);
      await carregarKitsFesta();
    } catch (error) {
      setErro(isApiError(error) ? error.message : "Nao foi possivel remover.");
    } finally {
      setKitRemovendo(null);
    }
  }

  async function handleAlternarStatusKit(kit: AdminKitFesta) {
    const novoStatusAtivo = !kit.ativo;
    setKitAlterandoStatus(kit.id); setErro(null); setSucesso(null);
    try {
      await atualizarAdminKitFesta(kit.id, { ativo: novoStatusAtivo });
      setSucesso(novoStatusAtivo ? "Kit ativado com sucesso." : "Kit desativado com sucesso.");
      await carregarKitsFesta();
    } catch (error) {
      setErro(isApiError(error) ? error.message : "Falha ao atualizar status.");
    } finally {
      setKitAlterandoStatus(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Gestão de Kits Festa</h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            Cadastre e edite os seus pacotes prontos usando a caixinha de brinquedos.
          </p>
        </div>
        <div className="flex w-full items-center sm:w-auto sm:justify-end">
          <Link href="/admin/kits/novo" className="w-full sm:w-auto">
            <Button type="button" variant="primary" className="w-full sm:w-auto">
              Novo Kit Festa
            </Button>
          </Link>
        </div>
      </div>

      {sucesso && <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{sucesso}</div>}
      {erro && <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">{erro}</div>}

      {formAberto && (
        <Card padding="lg" className="border-teal-500 ring-1 ring-teal-500 shadow-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <section>
              <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800">1. Dados do Kit (Edição)</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(160px,1fr)]">
                <div>
                  <Input label="Nome *" value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} error={erroCampo(fieldErrors, "nome")} required />
                </div>
                <Input label="Ordem" type="number" step="1" min="0" value={form.ordem} onChange={(e) => setForm((c) => ({ ...c, ordem: e.target.value }))} error={erroCampo(fieldErrors, "ordem")} />
                
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-2 md:col-span-2 sm:p-4 lg:grid-cols-3">
                  <Input label="Diária (R$)" type="number" step="0.01" min="0" value={form.preco_diaria} onChange={(e) => setForm((c) => ({ ...c, preco_diaria: e.target.value }))} error={erroCampo(fieldErrors, "preco_diaria")} />
                  <Input label="15 dias (R$)" type="number" step="0.01" min="0" value={form.preco_15_dias} onChange={(e) => setForm((c) => ({ ...c, preco_15_dias: e.target.value }))} error={erroCampo(fieldErrors, "preco_15_dias")} />
                  <Input label="30 dias (R$)" type="number" step="0.01" min="0" value={form.preco_30_dias} onChange={(e) => setForm((c) => ({ ...c, preco_30_dias: e.target.value }))} error={erroCampo(fieldErrors, "preco_30_dias")} />
                </div>
              </div>
              <div className="mt-6">
                <Textarea label="Descrição do kit *" rows={4} className="min-h-[112px] max-h-[320px] leading-6" placeholder="Explique o tema, a ocasião e os principais itens do kit." value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} error={erroCampo(fieldErrors, "descricao")} required />
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex flex-col gap-2 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                2. Composição do Kit (Caixinha) *
                <span className="text-sm font-normal text-teal-600 bg-teal-50 px-3 py-1 rounded-full w-fit">
                  {Object.values(quantidadesSelecionadas).reduce((a, b) => a + b, 0)} itens no kit
                </span>
              </h2>
              
              {carregandoBrinquedos ? (
                 <div className="p-8 text-center text-zinc-500 animate-pulse">Carregando prateleiras...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-2 border border-zinc-200 rounded-xl bg-zinc-50/50 custom-scrollbar">
                  {brinquedosDisponiveis.map((brinquedo) => {
                    const img = brinquedo.imagem_principal?.url ? resolveMediaUrl(brinquedo.imagem_principal.url) : null;
                    const qtd = quantidadesSelecionadas[brinquedo.id] || 0;
                    const selecionado = qtd > 0;

                    return (
                      <div key={brinquedo.id} className={`flex flex-col p-3 border rounded-xl bg-white transition-all ${selecionado ? 'border-teal-500 shadow-sm ring-1 ring-teal-500' : 'border-zinc-200 hover:border-zinc-300'}`}>
                        <div className="flex gap-3">
                          <div className="w-14 h-14 bg-zinc-100 rounded-lg flex-shrink-0 overflow-hidden border border-zinc-200 flex items-center justify-center">
                            {img ? <img src={img} alt="img" className="w-full h-full object-cover" /> : <span className="text-[10px] text-zinc-400">Sem foto</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-800 line-clamp-2 leading-tight">{brinquedo.nome}</p>
                            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">{brinquedo.categoria?.nome || "Sem categoria"}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
                          <span className="text-xs font-semibold text-zinc-600">Quantidade:</span>
                          <div className="flex items-center gap-3 bg-zinc-100 rounded-lg p-1">
                            <button type="button" aria-label={`Diminuir quantidade de ${brinquedo.nome}`} onClick={() => handleDecrementar(brinquedo.id)} className={`flex h-10 w-10 items-center justify-center rounded-md font-bold transition-colors ${qtd > 0 ? 'bg-white text-red-500 shadow-sm hover:bg-red-50' : 'text-zinc-400 cursor-not-allowed'}`}>-</button>
                            <span className="w-4 text-center text-sm font-black text-zinc-800">{qtd}</span>
                            <button type="button" aria-label={`Aumentar quantidade de ${brinquedo.nome}`} onClick={() => handleIncrementar(brinquedo.id)} className="flex h-10 w-10 items-center justify-center rounded-md bg-white font-bold text-teal-600 shadow-sm transition-colors hover:bg-teal-50">+</button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(unidadesPorBrinquedo[brinquedo.id] || []).map((unidade) => {
                            const selecionada = (unidadesSelecionadas[brinquedo.id] || []).includes(unidade.id);
                            return (
                              <label key={unidade.id} className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[10px] text-zinc-600">
                                <input
                                  type="checkbox"
                                  checked={selecionada}
                                  disabled={unidade.status !== "disponivel" && !selecionada}
                                  onChange={() => alternarUnidade(brinquedo.id, unidade.id)}
                                />
                                <span>{unidade.codigo}</span>
                                <span className="text-zinc-400">({unidade.status_label})</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800">3. Capa e Status</h2>
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-[160px_minmax(0,1fr)]">
                <div className="h-28 overflow-hidden rounded-md border border-zinc-200 bg-white">
                  {imagemPreviewUrl ? (
                    <img src={imagemPreviewUrl} alt="Prévia" className="h-full w-full object-cover" />
                  ) : kitEmEdicao && kits.find((k) => k.id === kitEmEdicao)?.imagem_url && !removerImagemAtual ? (
                    <img src={kits.find((k) => k.id === kitEmEdicao)?.imagem_url ?? ""} alt="Imagem atual" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-400">Sem imagem</div>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <Input label="Nova imagem (Opcional)" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setImagemArquivo(e.target.files?.[0] ?? null); setRemoverImagemAtual(false); }} />
                  {kitEmEdicao && kits.find((k) => k.id === kitEmEdicao)?.imagem_url && (
                    <Checkbox label="Remover imagem atual" checked={removerImagemAtual} onChange={(e) => { setRemoverImagemAtual(e.target.checked); if (e.target.checked) setImagemArquivo(null); }} />
                  )}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <Checkbox label="Ativo no catálogo" checked={form.ativo} onChange={(e) => setForm((c) => ({ ...c, ativo: e.target.checked }))} />
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
              <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={fecharFormulario}>Cancelar</Button>
              <Button className="w-full sm:w-auto" type="submit" variant="primary" loading={salvando}>Salvar Edição do Kit</Button>
            </div>
          </form>
        </Card>
      )}

      {/* LISTAGEM DOS KITS */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Kits cadastrados</h2>
          <span className="text-sm text-zinc-500">{kitsOrdenados.length} kit(s)</span>
        </div>

        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Carregando kits festa...</div>
        ) : kitsOrdenados.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Nenhum kit festa cadastrado ainda.</div>
        ) : (
          <div className="grid gap-4">
            {kitsOrdenados.map((kit) => (
              <article key={kit.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="grid md:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_230px]">
                  <div className="relative min-h-48 overflow-hidden border-b border-zinc-100 bg-zinc-50 md:min-h-full md:border-b-0 md:border-r">
                    {kit.imagem_url ? (
                      <img src={kit.imagem_url} alt={kit.nome} className="absolute inset-0 h-full w-full object-contain p-3" />
                    ) : (
                      <div className="flex h-full min-h-48 items-center justify-center text-xs font-medium text-zinc-400">Sem imagem</div>
                    )}
                  </div>
                  <div className="min-w-0 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Kit Festa</p>
                        <h3 className="mt-1 text-lg sm:text-xl font-bold leading-tight text-zinc-900">{kit.nome}</h3>
                      </div>
                      {kit.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="default">Inativo</Badge>}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">{kit.descricao || "Sem descrição cadastrada."}</p>
                    <div className="mt-4 rounded-xl bg-zinc-50 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Composição</p>
                      <p className="mt-1 text-sm leading-5 text-zinc-700">{resumirItens(kit)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {kit.periodos_disponiveis.map((periodo) => (
                        <div key={periodo.tipo} className="min-w-24 rounded-xl bg-zinc-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{periodo.label}</p>
                          <p className="mt-1 whitespace-nowrap text-sm font-bold text-zinc-900">{formatarMoeda(periodo.preco)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between gap-4 border-t border-zinc-100 bg-zinc-50/60 p-4 md:col-start-2 xl:col-start-auto xl:border-l xl:border-t-0">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Ações</p>
                      <div className="mt-3 flex flex-col gap-2">
                        <Button className="w-full" type="button" size="sm" variant="primary" onClick={() => abrirEdicao(kit)}>Editar kit</Button>
                        <Button className="w-full" type="button" size="sm" variant="outline" loading={kitAlterandoStatus === kit.id} disabled={kitRemovendo === kit.id} onClick={() => void handleAlternarStatusKit(kit)}>
                          {kit.ativo ? "Ocultar do catálogo" : "Reativar kit"}
                        </Button>
                      </div>
                    </div>
                    <div className="border-t border-zinc-200 pt-3">
                      <button type="button" disabled={kitAlterandoStatus === kit.id || kitRemovendo === kit.id} onClick={() => void handleRemoverKit(kit)} className="flex w-full min-h-10 items-center justify-center rounded-lg px-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50">
                        {kitRemovendo === kit.id ? "Removendo..." : "Remover kit"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}