"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  listarBrinquedos,
  listarKitsFesta,
  listarUnidadesBrinquedo,
  type UnidadeBrinquedoAdmin,
} from "@/services/catalogo";
import {
  atualizarPedidoManualAdmin,
  criarPedidoManualAdmin,
} from "@/services/adminPedidos";
import type {
  AdminPedidoDetail,
  AdminPedidoManualPayload,
} from "@/types/adminPedidos";
import type { BrinquedoCatalogo, KitFestaCatalogo } from "@/types/catalogo";

type LinhaItem = {
  tipo_item: "brinquedo" | "kit_festa";
  item_id: string;
  quantidade: number;
  unidade_ids: string[];
};

type Props = {
  pedido?: AdminPedidoDetail;
};

const periodos = [
  { value: "", label: "Sem duração definida" },
  { value: "diaria", label: "Diária" },
  { value: "3_dias", label: "3 dias" },
  { value: "15_dias", label: "15 dias" },
  { value: "30_dias", label: "30 dias" },
] as const;

export function PedidoManualForm({ pedido }: Props) {
  const router = useRouter();
  const [brinquedos, setBrinquedos] = useState<BrinquedoCatalogo[]>([]);
  const [kits, setKits] = useState<KitFestaCatalogo[]>([]);
  const [nome, setNome] = useState(pedido?.cliente_snapshot.nome ?? "");
  const [telefone, setTelefone] = useState(pedido?.cliente_snapshot.telefone ?? "");
  const [email, setEmail] = useState(pedido?.cliente_snapshot.email ?? "");
  const [dataInicio, setDataInicio] = useState(pedido?.data_inicio_locacao ?? "");
  const [periodo, setPeriodo] = useState<AdminPedidoManualPayload["periodo_locacao"]>(null);
  const [cep, setCep] = useState(pedido?.endereco_entrega.cep ?? "");
  const [numero, setNumero] = useState(pedido?.endereco_entrega.numero ?? "");
  const [complemento, setComplemento] = useState(
    pedido?.endereco_entrega.complemento ?? "",
  );
  const [observacoes, setObservacoes] = useState(pedido?.observacoes_cliente ?? "");
  const [itens, setItens] = useState<LinhaItem[]>(
    pedido?.itens.map((item) => ({
      tipo_item: item.tipo_item as "brinquedo" | "kit_festa",
      item_id: String(
        item.resumo_composicao.brinquedo?.id ??
          item.resumo_composicao.kit_festa?.id ??
          "",
      ),
      quantidade: item.quantidade,
      unidade_ids:
        item.resumo_composicao.unidades_selecionadas?.map((unidade) =>
          String(unidade.id),
        ) ?? [],
    })) ?? [],
  );
  const [unidadesPorBrinquedo, setUnidadesPorBrinquedo] = useState<
    Record<number, UnidadeBrinquedoAdmin[]>
  >({});
  const [unidadesCarregando, setUnidadesCarregando] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarBrinquedos(), listarKitsFesta()])
      .then(([listaBrinquedos, listaKits]) => {
        setBrinquedos(listaBrinquedos);
        setKits(listaKits);
      })
      .catch(() => setErro("Não foi possível carregar brinquedos e kits."));
  }, []);

  async function carregarUnidades(brinquedoId: number) {
    if (!brinquedoId || unidadesPorBrinquedo[brinquedoId]) return;
    setUnidadesCarregando((atuais) => [...new Set([...atuais, brinquedoId])]);
    try {
      const unidades = await listarUnidadesBrinquedo(brinquedoId);
      setUnidadesPorBrinquedo((atuais) => ({
        ...atuais,
        [brinquedoId]: unidades,
      }));
    } catch {
      setErro("Nao foi possivel carregar as unidades do brinquedo.");
    } finally {
      setUnidadesCarregando((atuais) =>
        atuais.filter((id) => id !== brinquedoId),
      );
    }
  }

  useEffect(() => {
    const brinquedoIds = Array.from(
      new Set(
        itens
          .filter((item) => item.tipo_item === "brinquedo" && item.item_id)
          .map((item) => Number(item.item_id)),
      ),
    );
    brinquedoIds.forEach((brinquedoId) => {
      void carregarUnidades(brinquedoId);
    });
    // A carga tambem acontece imediatamente ao trocar o brinquedo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opcoesPorTipo = useMemo(
    () => ({
      brinquedo: brinquedos.map((item) => ({ id: item.id, nome: item.nome })),
      kit_festa: kits.map((item) => ({ id: item.id, nome: item.nome })),
    }),
    [brinquedos, kits],
  );

  function adicionarLinha() {
    setItens((atuais) => [
      ...atuais,
      { tipo_item: "brinquedo", item_id: "", quantidade: 1, unidade_ids: [] },
    ]);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    const payload: AdminPedidoManualPayload = {
      nome,
      telefone,
      email,
      data_inicio: dataInicio || null,
      periodo_locacao: periodo || null,
      cep,
      numero,
      complemento,
      observacoes,
      itens: itens
        .filter((item) => item.item_id)
        .map((item) => ({
          tipo_item: item.tipo_item,
          item_id: Number(item.item_id),
          quantidade: item.quantidade,
          unidade_ids: item.unidade_ids
            .filter(Boolean)
            .map((unidadeId) => Number(unidadeId)),
        })),
    };
    try {
      const salvo = pedido
        ? await atualizarPedidoManualAdmin(pedido.id, payload)
        : await criarPedidoManualAdmin(payload);
      router.push(`/admin/pedidos/${salvo.id}`);
    } catch (error) {
      setErro(
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Não foi possível salvar o pedido.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="flex max-w-4xl flex-col gap-6">
      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Data inicial" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          Duração
          <select
            value={periodo ?? ""}
            onChange={(e) => setPeriodo((e.target.value || null) as AdminPedidoManualPayload["periodo_locacao"])}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3"
          >
            {periodos.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <Input label="CEP" value={cep} onChange={(e) => setCep(e.target.value)} />
        <Input label="Número" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <Input label="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 sm:col-span-2">
          Observações
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-teal-600"
          />
        </label>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-bold text-zinc-900">Brinquedos e kits</h2>
          <Button type="button" variant="outline" onClick={adicionarLinha}>Adicionar item</Button>
        </div>
        <div className="flex flex-col gap-3">
          {itens.length === 0 && <p className="text-sm text-zinc-500">Nenhum item adicionado.</p>}
          {itens.map((item, index) => {
            const brinquedoId = Number(item.item_id);
            const unidadesDisponiveis = (unidadesPorBrinquedo[brinquedoId] ?? []).filter(
              (unidade) => unidade.status === "disponivel" && !unidade.dedicada_kit_festa,
            );
            const unidadesSelecionadasEmOutrasLinhas = new Set(
              itens.flatMap((linha, linhaIndex) =>
                linhaIndex === index ? [] : linha.unidade_ids.filter(Boolean),
              ),
            );

            return (
            <div key={index} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
              <div className="grid gap-2 sm:grid-cols-[140px_1fr_100px_auto]">
              <select
                value={item.tipo_item}
                onChange={(e) => setItens((atuais) => atuais.map((atual, i) => i === index ? { ...atual, tipo_item: e.target.value as LinhaItem["tipo_item"], item_id: "", unidade_ids: [] } : atual))}
                className="h-11 rounded-lg border border-zinc-300 bg-white px-3"
              >
                <option value="brinquedo">Brinquedo</option>
                <option value="kit_festa">Kit</option>
              </select>
              <select
                value={item.item_id}
                onChange={(e) => {
                  const itemId = e.target.value;
                  setItens((atuais) => atuais.map((atual, i) => i === index ? { ...atual, item_id: itemId, unidade_ids: [] } : atual));
                  if (item.tipo_item === "brinquedo" && itemId) {
                    void carregarUnidades(Number(itemId));
                  }
                }}
                className="h-11 rounded-lg border border-zinc-300 bg-white px-3"
              >
                <option value="">Selecione</option>
                {opcoesPorTipo[item.tipo_item].map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.nome}</option>)}
              </select>
              <Input aria-label="Quantidade" type="number" min={1} value={item.quantidade} onChange={(e) => {
                const quantidade = Math.max(1, Number(e.target.value));
                setItens((atuais) => atuais.map((atual, i) => i === index ? { ...atual, quantidade, unidade_ids: atual.unidade_ids.slice(0, quantidade) } : atual));
              }} />
              <Button type="button" variant="ghost" onClick={() => setItens((atuais) => atuais.filter((_, i) => i !== index))}>Remover</Button>
              </div>

              {item.tipo_item === "brinquedo" && item.item_id ? (
                <div className="mt-3 border-t border-zinc-200 pt-3">
                  <p className="text-sm font-semibold text-zinc-800">Unidades fisicas</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Escolha uma unidade para cada quantidade ou deixe sem selecao para o sistema definir ao reservar.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: item.quantidade }, (_, unidadeIndex) => (
                      <label key={unidadeIndex} className="flex flex-col gap-1.5 text-xs font-medium text-zinc-600">
                        Unidade {unidadeIndex + 1}
                        <select
                          value={item.unidade_ids[unidadeIndex] ?? ""}
                          onChange={(e) => setItens((atuais) => atuais.map((atual, i) => {
                            if (i !== index) return atual;
                            const unidadeIds = [...atual.unidade_ids];
                            unidadeIds[unidadeIndex] = e.target.value;
                            return { ...atual, unidade_ids: unidadeIds };
                          }))}
                          disabled={unidadesCarregando.includes(brinquedoId)}
                          className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm disabled:bg-zinc-100"
                        >
                          <option value="">
                            {unidadesCarregando.includes(brinquedoId)
                              ? "Carregando unidades..."
                              : "Definir automaticamente depois"}
                          </option>
                          {unidadesDisponiveis.map((unidade) => (
                            <option
                              key={unidade.id}
                              value={unidade.id}
                              disabled={
                                unidadesSelecionadasEmOutrasLinhas.has(String(unidade.id)) ||
                                item.unidade_ids.some(
                                  (selecionada, selecionadaIndex) =>
                                    selecionadaIndex !== unidadeIndex &&
                                    selecionada === String(unidade.id),
                                )
                              }
                            >
                              {unidade.codigo}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  {!unidadesCarregando.includes(brinquedoId) && unidadesDisponiveis.length === 0 ? (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      Nenhuma unidade avulsa disponivel para este brinquedo.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      </div>

      {erro && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>}
      <div className="flex gap-3">
        <Button type="submit" loading={salvando}>{pedido ? "Salvar alterações" : "Criar pedido"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
