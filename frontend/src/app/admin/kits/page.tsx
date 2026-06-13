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
import { listarBrinquedos } from "@/services/catalogo";
import { resolveMediaUrl } from "@/lib/media-url";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type { AdminKitFesta } from "@/types/adminKits";
import type { BrinquedoCatalogo } from "@/types/catalogo";

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

function periodoResumo(kit: AdminKitFesta): string {
  if (!kit.periodos_disponiveis.length) return "Sem periodo";
  return kit.periodos_disponiveis.map((p) => `${p.label}: ${formatarMoeda(p.preco)}`).join(" | ");
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

  // A Mágica da "Caixinha" na Edição
  const [brinquedosDisponiveis, setBrinquedosDisponiveis] = useState<BrinquedoCatalogo[]>([]);
  const [carregandoBrinquedos, setCarregandoBrinquedos] = useState(false);
  const [quantidadesSelecionadas, setQuantidadesSelecionadas] = useState<Record<number, number>>({});

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

  // Função chamada ao clicar em "Editar" num Kit
  async function abrirEdicao(kit: AdminKitFesta) {
    setForm(formFromKit(kit));
    setKitEmEdicao(kit.id);
    setImagemArquivo(null);
    setRemoverImagemAtual(false);
    setFieldErrors(undefined);
    setErro(null);
    setSucesso(null);
    setFormAberto(true);

    // Carrega a prateleira de brinquedos
    setCarregandoBrinquedos(true);
    try {
      const todos = await listarBrinquedos();
      const lista = Array.isArray(todos) ? todos : (todos as any).results || [];
      setBrinquedosDisponiveis(lista);
      
      // Carrega os brinquedos que já estão salvos neste kit para a "Caixinha"
      const mapQtd: Record<number, number> = {};
      kit.itens.forEach(item => {
        if (item.brinquedo && item.brinquedo.id) {
          mapQtd[item.brinquedo.id] = item.quantidade;
        }
      });
      setQuantidadesSelecionadas(mapQtd);
    } catch (err) {
      console.error("Erro ao carregar brinquedos na edição", err);
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
    setQuantidadesSelecionadas(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleDecrementar = (id: number) => {
    setQuantidadesSelecionadas(prev => {
      const atual = prev[id] || 0;
      if (atual <= 0) return prev;
      const novo = { ...prev, [id]: atual - 1 };
      if (novo[id] === 0) delete novo[id];
      return novo;
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true); setErro(null); setSucesso(null); setFieldErrors(undefined);

    const itensParaEnviar = Object.entries(quantidadesSelecionadas)
      .filter(([_, qtd]) => qtd > 0)
      .map(([id, qtd]) => ({ brinquedo_id: parseInt(id), quantidade: qtd }));

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestão de Kits Festa</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Cadastre e edite os seus pacotes prontos usando a caixinha de brinquedos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Botão configurado para ir para a página de Novo Kit */}
          <Link href="/admin/kits/novo">
            <Button type="button" variant="primary">
              Novo Kit Festa
            </Button>
          </Link>
        </div>
      </div>

      {sucesso && <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{sucesso}</div>}
      {erro && <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">{erro}</div>}

      {/* FORMULÁRIO DE EDIÇÃO INLINE */}
      {formAberto && (
        <Card padding="lg" className="border-teal-500 ring-1 ring-teal-500 shadow-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            
            <section>
              <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800">1. Dados do Kit (Edição)</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input label="Nome *" value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} error={erroCampo(fieldErrors, "nome")} required />
                </div>
                <Input label="Diária (R$)" type="number" step="0.01" min="0" value={form.preco_diaria} onChange={(e) => setForm((c) => ({ ...c, preco_diaria: e.target.value }))} error={erroCampo(fieldErrors, "preco_diaria")} />
                <Input label="15 dias (R$)" type="number" step="0.01" min="0" value={form.preco_15_dias} onChange={(e) => setForm((c) => ({ ...c, preco_15_dias: e.target.value }))} error={erroCampo(fieldErrors, "preco_15_dias")} />
                <Input label="30 dias (R$)" type="number" step="0.01" min="0" value={form.preco_30_dias} onChange={(e) => setForm((c) => ({ ...c, preco_30_dias: e.target.value }))} error={erroCampo(fieldErrors, "preco_30_dias")} />
                <Input label="Ordem" type="number" step="1" min="0" value={form.ordem} onChange={(e) => setForm((c) => ({ ...c, ordem: e.target.value }))} error={erroCampo(fieldErrors, "ordem")} />
              </div>
              <div className="mt-6">
                <Textarea label="Descrição completa *" value={form.descricao} onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))} error={erroCampo(fieldErrors, "descricao")} required />
              </div>
            </section>

            {/* A NOVA CAIXINHA DE EDIÇÃO (IGUAL À DE CRIAÇÃO) */}
            <section>
              <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-800 flex justify-between items-center">
                2. Composição do Kit (Caixinha) *
                <span className="text-sm font-normal text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
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
                            <button type="button" onClick={() => handleDecrementar(brinquedo.id)} className={`w-6 h-6 flex items-center justify-center rounded-md font-bold transition-colors ${qtd > 0 ? 'bg-white text-red-500 shadow-sm hover:bg-red-50' : 'text-zinc-400 cursor-not-allowed'}`}>-</button>
                            <span className="w-4 text-center text-sm font-black text-zinc-800">{qtd}</span>
                            <button type="button" onClick={() => handleIncrementar(brinquedo.id)} className="w-6 h-6 flex items-center justify-center rounded-md bg-white shadow-sm text-teal-600 hover:bg-teal-50 font-bold transition-colors">+</button>
                          </div>
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

            <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
              <Button type="button" variant="ghost" onClick={fecharFormulario}>Cancelar</Button>
              <Button type="submit" variant="primary" loading={salvando}>Salvar Edição do Kit</Button>
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
          <Table>
            <Thead>
              <Tr>
                <Th>Nome do kit</Th>
                <Th>Imagem</Th>
                <Th>Composição</Th>
                <Th>Períodos</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </Tr>
            </Thead>
            <Tbody>
              {kitsOrdenados.map((kit) => (
                <Tr key={kit.id}>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-900">{kit.nome}</span>
                      <span className="mt-0.5 max-w-md truncate text-xs text-zinc-400">{kit.descricao}</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="h-14 w-20 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                      {kit.imagem_url ? (
                        <img src={kit.imagem_url} alt={kit.nome} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-medium text-zinc-400">Sem imagem</div>
                      )}
                    </div>
                  </Td>
                  <Td><span className="text-sm text-zinc-600">{resumirItens(kit)}</span></Td>
                  <Td className="font-medium text-zinc-900">{periodoResumo(kit)}</Td>
                  <Td>
                    {kit.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="default">Inativo</Badge>}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => abrirEdicao(kit)}>Editar</Button>
                      <Button type="button" size="sm" variant={kit.ativo ? "outline" : "secondary"} loading={kitAlterandoStatus === kit.id} disabled={kitRemovendo === kit.id} onClick={() => void handleAlternarStatusKit(kit)}>
                        {kit.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" loading={kitRemovendo === kit.id} disabled={kitAlterandoStatus === kit.id} onClick={() => void handleRemoverKit(kit)}>Remover</Button>
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