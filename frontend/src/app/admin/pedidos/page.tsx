"use client";

import { useRouter } from "next/navigation";

import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const mockPedidos = [
  {
    id: "1042",
    cliente: "Camila Rodrigues",
    dataInicio: "20/05/2026",
    dataFim: "20/06/2026",
    totalEstimado: 205.90,
    status: "aguardando_analise",
  },
  {
    id: "1041",
    cliente: "Mariana Souza",
    dataInicio: "18/05/2026",
    dataFim: "18/07/2026",
    totalEstimado: 410.00,
    status: "reservado",
  },
  {
    id: "1040",
    cliente: "Joao Pedro Alves",
    dataInicio: "15/05/2026",
    dataFim: "15/06/2026",
    totalEstimado: 189.50,
    status: "em_locacao",
  },
  {
    id: "1039",
    cliente: "Beatriz Lima",
    dataInicio: "01/05/2026",
    dataFim: "01/06/2026",
    totalEstimado: 320.00,
    status: "cancelado",
  },
];

const statusOptions = [
  { value: "aguardando_analise", label: "Aguardando analise" },
  { value: "reservado", label: "Reservado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "em_locacao", label: "Em locacao" },
  { value: "retirado", label: "Retirado" },
  { value: "cancelado", label: "Cancelado" },
];

const renderStatusBadge = (status: string) => {
  switch (status) {
    case "aguardando_analise":
      return <Badge variant="warning">Aguardando analise</Badge>;
    case "reservado":
      return <Badge variant="brand">Reservado</Badge>;
    case "confirmado":
      return <Badge variant="success">Confirmado</Badge>;
    case "em_locacao":
      return <Badge variant="brand">Em locacao</Badge>;
    case "retirado":
      return <Badge variant="default">Retirado</Badge>;
    case "cancelado":
      return <Badge variant="default">Cancelado</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

export default function PedidosPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestao de Pedidos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Acompanhe as locacoes de brinquedos e kits.
          </p>
        </div>
        <Button variant="primary">Exportar relatorio</Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row gap-4 items-end shadow-sm">
        <div className="flex-1 w-full">
          <Input
            placeholder="Buscar por nome do cliente ou numero do pedido..."
            className="h-10"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            options={[
              { value: "todos", label: "Todos os status" },
              ...statusOptions,
            ]}
            className="h-10"
          />
        </div>
        <Button variant="secondary" className="h-10 px-6">
          Filtrar
        </Button>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Pedido</Th>
            <Th>Cliente</Th>
            <Th>Periodo de locacao</Th>
            <Th>Total estimado</Th>
            <Th>Status</Th>
            <Th className="text-right">Acoes</Th>
          </Tr>
        </Thead>
        <Tbody>
          {mockPedidos.map((pedido) => (
            <Tr key={pedido.id}>
              <Td className="font-bold text-teal-600">#{pedido.id}</Td>
              <Td className="font-medium text-zinc-900">{pedido.cliente}</Td>
              <Td>
                <div className="flex flex-col">
                  <span className="text-sm text-zinc-900">{pedido.dataInicio}</span>
                  <span className="text-xs text-zinc-500">ate {pedido.dataFim}</span>
                </div>
              </Td>
              <Td className="font-medium">
                R$ {pedido.totalEstimado.toFixed(2).replace(".", ",")}
              </Td>
              <Td>{renderStatusBadge(pedido.status)}</Td>
              <Td className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}
                >
                  Ver detalhes
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
