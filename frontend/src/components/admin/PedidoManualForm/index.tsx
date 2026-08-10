"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { listarBrinquedos, listarKitsFesta } from "@/services/catalogo";
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
    })) ?? [],
  );
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
      { tipo_item: "brinquedo", item_id: "", quantidade: 1 },
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
          {itens.map((item, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[140px_1fr_100px_auto]">
              <select
                value={item.tipo_item}
                onChange={(e) => setItens((atuais) => atuais.map((atual, i) => i === index ? { ...atual, tipo_item: e.target.value as LinhaItem["tipo_item"], item_id: "" } : atual))}
                className="h-11 rounded-lg border border-zinc-300 bg-white px-3"
              >
                <option value="brinquedo">Brinquedo</option>
                <option value="kit_festa">Kit</option>
              </select>
              <select
                value={item.item_id}
                onChange={(e) => setItens((atuais) => atuais.map((atual, i) => i === index ? { ...atual, item_id: e.target.value } : atual))}
                className="h-11 rounded-lg border border-zinc-300 bg-white px-3"
              >
                <option value="">Selecione</option>
                {opcoesPorTipo[item.tipo_item].map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.nome}</option>)}
              </select>
              <Input aria-label="Quantidade" type="number" min={1} value={item.quantidade} onChange={(e) => setItens((atuais) => atuais.map((atual, i) => i === index ? { ...atual, quantidade: Math.max(1, Number(e.target.value)) } : atual))} />
              <Button type="button" variant="ghost" onClick={() => setItens((atuais) => atuais.filter((_, i) => i !== index))}>Remover</Button>
            </div>
          ))}
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
