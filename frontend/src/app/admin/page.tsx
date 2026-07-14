"use client";

import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { useRouter } from "next/navigation";

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
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Olá, Administrador 👋</h1>
        <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
          Aqui está o resumo da sua operação na BabyPlays hoje.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-500 sm:text-sm">Pedidos Pendentes</span>
          <span className="text-2xl font-bold text-zinc-900 sm:text-3xl">12</span>
          <span className="mt-1 text-[10px] font-medium text-teal-600 sm:text-xs">↑ 2 novos hoje</span>
        </Card>
        
        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-500 sm:text-sm">Brinquedos Alugados</span>
          <span className="text-2xl font-bold text-zinc-900 sm:text-3xl">48</span>
          <span className="mt-1 text-[10px] text-zinc-400 sm:text-xs">De 120 unidades físicas</span>
        </Card>

        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-500 sm:text-sm">Entregas para Hoje</span>
          <span className="text-2xl font-bold text-zinc-900 sm:text-3xl">5</span>
          <span className="mt-1 text-[10px] font-medium text-amber-600 sm:text-xs">Requerem atenção</span>
        </Card>

        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-500 sm:text-sm">Faturamento Previsto</span>
          <span className="text-2xl font-bold text-teal-600 sm:text-3xl">R$ 4.250</span>
          <span className="mt-1 text-[10px] text-zinc-400 sm:text-xs">Neste mês</span>
        </Card>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-800 sm:text-lg">Últimos Pedidos</h2>
            <button 
              onClick={() => router.push("/admin/pedidos")}
              className="text-xs font-medium text-teal-600 hover:underline sm:text-sm"
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

        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-base font-bold text-zinc-800 sm:text-lg">Ações Rápidas</h2>
          
          <Card padding="lg" className="flex flex-col gap-3 sm:gap-4">
            <button 
              onClick={() => router.push("/admin/brinquedos/novo")}
              className="group flex w-full items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 text-left transition-colors hover:border-teal-600 hover:bg-teal-50 sm:px-4 sm:py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                +
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900">Novo Brinquedo</span>
                <span className="block truncate text-xs text-zinc-500">Adicionar ao catálogo</span>
              </div>
            </button>

            <button 
              className="group flex w-full items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 text-left transition-colors hover:border-amber-500 hover:bg-amber-50 sm:px-4 sm:py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                !
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900">Atualizar Estoque</span>
                <span className="block truncate text-xs text-zinc-500">2 brinquedos em manutenção</span>
              </div>
            </button>

            <button 
              onClick={() => router.push("/admin/contrato")}
              className="group flex w-full items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 text-left transition-colors hover:border-teal-600 hover:bg-teal-50 sm:px-4 sm:py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                C
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900">Contrato de locação</span>
                <span className="block truncate text-xs text-zinc-500">Editar contrato</span>
              </div>
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}