"use client";
import { useRouter } from "next/navigation";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

// Exemplos de pedidos que vou puxar da API
const mockPedidos = [
  {
    id: "1042",
    cliente: "Camila Rodrigues",
    dataInicio: "20/05/2026",
    dataFim: "20/06/2026",
    valorTotal: 245.90,
    status: "AGUARDANDO_PAGAMENTO",
  },
  {
    id: "1041",
    cliente: "Mariana Souza",
    dataInicio: "18/05/2026",
    dataFim: "18/07/2026",
    valorTotal: 410.00,
    status: "EM_SEPARACAO",
  },
  {
    id: "1040",
    cliente: "João Pedro Alves",
    dataInicio: "15/05/2026",
    dataFim: "15/06/2026",
    valorTotal: 189.50,
    status: "SAIU_ENTREGA",
  },
  {
    id: "1039",
    cliente: "Beatriz Lima",
    dataInicio: "01/05/2026",
    dataFim: "01/06/2026",
    valorTotal: 320.00,
    status: "ENTREGUE",
  },
];

// Função auxiliar para renderizar a Badge correta dependendo do Status do Django
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
    case "DEVOLVIDO":
      return <Badge variant="default">Devolvido</Badge>;
    case "CANCELADO":
      return <Badge variant="default">Cancelado</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

export default function PedidosPage() {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-6">
      
      {/* Cabeçalho da Página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestão de Pedidos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Acompanhe e gira todas as locações de brinquedos e kits.
          </p>
        </div>
        <Button variant="primary">Exportar Relatório</Button>
      </div>

      {/* Barra de Filtros Rápidos */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row gap-4 items-end shadow-sm">
        <div className="flex-1 w-full">
          <Input 
            placeholder="Buscar por nome do cliente ou nº do pedido..." 
            className="h-10"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select 
            options={[
              { value: "todos", label: "Todos os status" },
              { value: "AGUARDANDO_PAGAMENTO", label: "Aguardando Pagamento" },
              { value: "EM_SEPARACAO", label: "Em Separação" },
              { value: "ENTREGUE", label: "Entregue" },
            ]} 
            className="h-10"
          />
        </div>
        <Button variant="secondary" className="h-10 px-6">
          Filtrar
        </Button>
      </div>

      {/* Tabela de Pedidos */}
      <Table>
        <Thead>
          <Tr>
            <Th>Nº Pedido</Th>
            <Th>Cliente</Th>
            <Th>Período de Locação</Th>
            <Th>Valor Total</Th>
            <Th>Status</Th>
            <Th className="text-right">Ações</Th>
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
                  <span className="text-xs text-zinc-500">até {pedido.dataFim}</span>
                </div>
              </Td>
              <Td className="font-medium">
                R$ {pedido.valorTotal.toFixed(2).replace('.', ',')}
              </Td>
              <Td>
                {renderStatusBadge(pedido.status)}
              </Td>
              <Td className="text-right">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/pedidos/${pedido.id}`)} // <-- Adicione essa linha
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