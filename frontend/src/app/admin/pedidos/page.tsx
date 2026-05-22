"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { listarPedidosAdmin } from "@/services/adminPedidos";
import type { ApiError } from "@/types/api";
import type {
  AdminPedidoListItem,
  AdminPedidosPaginatedResponse,
} from "@/types/adminPedidos";

const statusOptions = [
  { value: "aguardando_analise", label: "Aguardando analise" },
  { value: "reservado", label: "Reservado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "em_locacao", label: "Em locacao" },
  { value: "retirado", label: "Retirado" },
  { value: "cancelado", label: "Cancelado" },
];

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

function getAdminPedidosErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 401) {
      return "Voce precisa estar autenticado para acessar os pedidos administrativos.";
    }

    if (error.status === 403) {
      return "Seu usuario nao tem permissao de admin/staff para acessar esta listagem.";
    }

    return error.message;
  }

  return "Nao foi possivel carregar os pedidos administrativos agora.";
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatCurrency(value: string) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericValue);
}

function getClienteNome(pedido: AdminPedidoListItem) {
  return pedido.cliente?.nome || pedido.cliente_snapshot.nome || "Cliente sem nome";
}

const renderStatusBadge = (status: AdminPedidoListItem["status"]) => {
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
  const [pedidos, setPedidos] = useState<AdminPedidoListItem[]>([]);
  const [metadata, setMetadata] = useState<AdminPedidosPaginatedResponse | null>(null);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    busca: "",
    status: "todos",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function carregarPedidos() {
      setLoading(true);
      setError(null);

      try {
        const data = await listarPedidosAdmin(filtrosAplicados);

        if (!active) {
          return;
        }

        setPedidos(data.results);
        setMetadata(data);
      } catch (err) {
        if (!active) {
          return;
        }

        setPedidos([]);
        setMetadata(null);
        setError(getAdminPedidosErrorMessage(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarPedidos();

    return () => {
      active = false;
    };
  }, [filtrosAplicados]);

  const totalPedidos = metadata?.count ?? pedidos.length;
  const hasFiltros = Boolean(filtrosAplicados.busca || filtrosAplicados.status !== "todos");
  const emptyTitle = hasFiltros
    ? "Nenhum pedido encontrado para os filtros informados."
    : "Nenhum pedido administrativo encontrado.";

  const statusSelectOptions = useMemo(
    () => [{ value: "todos", label: "Todos os status" }, ...statusOptions],
    [],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFiltrosAplicados({ busca, status });
  }

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

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row gap-4 items-end shadow-sm"
      >
        <div className="flex-1 w-full">
          <Input
            placeholder="Buscar por nome do cliente ou numero do pedido..."
            className="h-10"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            options={statusSelectOptions}
            className="h-10"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" className="h-10 px-6" loading={loading}>
          Filtrar
        </Button>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {!error && (
        <div className="text-sm text-zinc-500">
          {loading ? "Carregando pedidos administrativos..." : `${totalPedidos} pedido(s) encontrado(s).`}
        </div>
      )}

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
          {loading ? (
            <Tr>
              <Td colSpan={6} className="text-center text-zinc-500">
                Carregando pedidos...
              </Td>
            </Tr>
          ) : pedidos.length === 0 ? (
            <Tr>
              <Td colSpan={6} className="text-center text-zinc-500">
                {emptyTitle}
              </Td>
            </Tr>
          ) : (
            pedidos.map((pedido) => (
              <Tr key={pedido.id}>
                <Td className="font-bold text-teal-600">#{pedido.id}</Td>
                <Td className="font-medium text-zinc-900">{getClienteNome(pedido)}</Td>
                <Td>
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-900">
                      {formatDate(pedido.data_inicio_locacao)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      ate {formatDate(pedido.data_fim_locacao)}
                    </span>
                  </div>
                </Td>
                <Td className="font-medium">
                  {formatCurrency(pedido.total_estimado_snapshot)}
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
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
