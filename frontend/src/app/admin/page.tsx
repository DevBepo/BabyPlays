"use client";

import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { useRouter } from "next/navigation";

// Dados simulados par aos últimos pedidos....

const ultimosPedidos = [
  {
    id: "1042",
    cliente: "Camila Rodrigues",
    valor: 245.9,
    status: "AGUARDANDO_PAGAMENTO",
    data: "Hoje, 14:32",
  },
  {
    id: "1041",
    cliente: "Mariana Souza",
    valor: 410.0,
    status: "EM_SEPARACAO",
    data: "Hoje, 10:15",
  },
  {
    id: "1040",
    cliente: "João Pedro Alves",
    valor: 189.5,
    status: "SAIU_ENTREGA",
    data: "Ontem, 16:40",
  },
];

export default function DashboardPage() {
  const router = useRouter();

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "AGUARDANDO_PAGAMENTO":
        return <Badge variant="warning">Aguardando Pagamento</Badge>;
      case "EM_SEPARACAO":
        return <Badge variant="brand">Em Separação</Badge>;
      case "SAIU_ENTREGA":
        return <Badge variant="brand">Saiu para Entrega</Badge>;
      case "ENTREGUE":
        return <Badge variant="success">Entregue</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Cabeçalho de Boas-vindas */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Olá, Administrador 👋</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Aqui está o resumo da sua operação na BabyPlays hoje.
        </p>
      </div>

      {/* Grid de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-500">Pedidos Pendentes</span>
          <span className="text-3xl font-bold text-zinc-900">12</span>
          <span className="text-xs text-teal-600 font-medium mt-1">↑ 2 novos hoje</span>
        </Card>
        
        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-500">Brinquedos Alugados</span>
          <span className="text-3xl font-bold text-zinc-900">48</span>
          <span className="text-xs text-zinc-400 mt-1">De 120 unidades físicas</span>
        </Card>

        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-500">Entregas para Hoje</span>
          <span className="text-3xl font-bold text-zinc-900">5</span>
          <span className="text-xs text-amber-600 font-medium mt-1">Requerem atenção</span>
        </Card>

        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-500">Faturamento Previsto</span>
          <span className="text-3xl font-bold text-teal-600">R$ 4.250</span>
          <span className="text-xs text-zinc-400 mt-1">Neste mês</span>
        </Card>
      </div>

      {/* Seção Principal Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Tabela de Últimos Pedidos (Ocupa 2 terços) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-800">Últimos Pedidos</h2>
            <button 
              onClick={() => router.push("/admin/pedidos")}
              className="text-sm font-medium text-teal-600 hover:underline"
            >
              Ver todos →
            </button>
          </div>
          
          <Table>
            <Thead>
              <Tr>
                <Th>Pedido</Th>
                <Th>Cliente</Th>
                <Th>Status</Th>
                <Th className="text-right">Valor</Th>
              </Tr>
            </Thead>
            <Tbody>
              {ultimosPedidos.map((pedido) => (
                <Tr key={pedido.id} className="cursor-pointer" onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}>
                  <Td className="font-bold text-zinc-900">#{pedido.id}</Td>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-800">{pedido.cliente}</span>
                      <span className="text-xs text-zinc-400">{pedido.data}</span>
                    </div>
                  </Td>
                  <Td>{renderStatusBadge(pedido.status)}</Td>
                  <Td className="text-right font-medium text-zinc-900">
                    R$ {pedido.valor.toFixed(2).replace('.', ',')}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>

        {/* Card de Ações Rápidas / Lembretes (Ocupa 1 terço) */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-zinc-800">Ações Rápidas</h2>
          
          <Card padding="lg" className="flex flex-col gap-4">
            <button 
              onClick={() => router.push("/admin/brinquedos/novo")}
              className="w-full text-left px-4 py-3 rounded-lg border border-zinc-200 hover:border-teal-600 hover:bg-teal-50 transition-colors flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold group-hover:bg-teal-600 group-hover:text-white transition-colors">
                +
              </div>
              <div>
                <span className="block text-sm font-semibold text-zinc-900">Novo Brinquedo</span>
                <span className="block text-xs text-zinc-500">Adicionar ao catálogo</span>
              </div>
            </button>

            <button 
              className="w-full text-left px-4 py-3 rounded-lg border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-colors flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold group-hover:bg-amber-500 group-hover:text-white transition-colors">
                !
              </div>
              <div>
                <span className="block text-sm font-semibold text-zinc-900">Atualizar Estoque</span>
                <span className="block text-xs text-zinc-500">2 brinquedos em manutenção</span>
              </div>
            </button>
            <button
              onClick={() => router.push("/admin/contrato")}
              className="w-full text-left px-4 py-3 rounded-lg border border-zinc-200 hover:border-teal-600 hover:bg-teal-50 transition-colors flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold group-hover:bg-teal-600 group-hover:text-white transition-colors">
                C
              </div>
              <div>
                <span className="block text-sm font-semibold text-zinc-900">
                  Contrato de locacao
                </span>
                <span className="block text-xs text-zinc-500">
                  Editar contrato
                </span>
              </div>
            </button>
          </Card>
        </div>

      </div>

    </div>
  );
}
