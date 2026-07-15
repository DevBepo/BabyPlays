"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { obterDashboardAdmin } from "@/services/adminDashboard";
import type { AdminDashboardResponse } from "@/types/adminDashboard";
import type { AdminPedidoListItem } from "@/types/adminPedidos";
import type { ApiError } from "@/types/api";

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

function getErrorMessage(error: unknown) {
  if (isApiError(error)) {
    return error.message;
  }

  return "Não foi possível carregar os dados reais do painel agora.";
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function getClienteNome(pedido: AdminPedidoListItem) {
  return pedido.cliente?.nome || pedido.cliente_snapshot.nome || "Cliente sem nome";
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function renderStatusBadge(status: AdminPedidoListItem["status"]) {
  switch (status) {
    case "aguardando_analise":
      return <Badge variant="warning">Aguardando análise</Badge>;
    case "reservado":
      return <Badge variant="brand">Reservado</Badge>;
    case "confirmado":
      return <Badge variant="success">Confirmado</Badge>;
    case "em_locacao":
      return <Badge variant="brand">Em locação</Badge>;
    case "retirado":
      return <Badge variant="default">Retirado</Badge>;
    case "cancelado":
      return <Badge variant="default">Cancelado</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function carregarDashboard() {
      setLoading(true);
      setError(null);

      try {
        const data = await obterDashboardAdmin();

        if (active) {
          setDashboard(data);
        }
      } catch (requestError) {
        if (active) {
          setDashboard(null);
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarDashboard();

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const pedidosAguardando = dashboard?.pedidos_aguardando_analise;
  const unidades = dashboard?.unidades;
  const ultimosPedidos = dashboard?.ultimos_pedidos ?? [];

  function abrirPedido(pedidoId: number) {
    router.push(`/admin/pedidos/${pedidoId}`);
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
            Visão geral da operação
          </h1>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            {dashboard
              ? `Dados atualizados em ${formatDateTime(dashboard.gerado_em)}.`
              : "Indicadores calculados diretamente a partir da operação cadastrada."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={loading}
          onClick={() => setReloadToken((current) => current + 1)}
        >
          Atualizar dados
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => setReloadToken((current) => current + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-500 sm:text-sm">
            Aguardando análise
          </span>
          <span className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            {dashboard ? pedidosAguardando?.total ?? 0 : "—"}
          </span>
          <span className="mt-1 text-[10px] font-medium text-teal-600 sm:text-xs">
            {dashboard
              ? `${pluralize(pedidosAguardando?.novos_hoje ?? 0, "novo", "novos")} hoje`
              : "Pedidos pendentes de avaliação"}
          </span>
        </Card>

        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-500 sm:text-sm">
            Unidades em locação
          </span>
          <span className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            {dashboard ? unidades?.em_locacao ?? 0 : "—"}
          </span>
          <span className="mt-1 text-[10px] text-zinc-400 sm:text-xs">
            {dashboard
              ? `De ${unidades?.total_operacionais ?? 0} unidades físicas não baixadas`
              : "Estoque físico cadastrado"}
          </span>
        </Card>

        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-500 sm:text-sm">
            Entregas para hoje
          </span>
          <span className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            {dashboard ? dashboard.entregas_hoje : "—"}
          </span>
          <span className="mt-1 text-[10px] font-medium text-amber-600 sm:text-xs">
            Pedidos confirmados com início hoje
          </span>
        </Card>

        <Card padding="lg" className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-500 sm:text-sm">
            Valor previsto no mês
          </span>
          <span className="text-2xl font-bold text-teal-600 sm:text-3xl">
            {dashboard ? formatCurrency(dashboard.valor_pedidos_mes.total) : "—"}
          </span>
          <span className="mt-1 text-[10px] text-zinc-400 sm:text-xs">
            Pedidos não cancelados com início no mês
          </span>
        </Card>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-800 sm:text-lg">
              Últimos pedidos
            </h2>
            <button
              type="button"
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
              {loading ? (
                <Tr>
                  <Td colSpan={4} className="py-8 text-center text-zinc-500">
                    Carregando pedidos reais...
                  </Td>
                </Tr>
              ) : ultimosPedidos.length === 0 ? (
                <Tr>
                  <Td colSpan={4} className="py-8 text-center text-zinc-500">
                    {error
                      ? "Os pedidos estão indisponíveis no momento."
                      : "Nenhum pedido cadastrado até agora."}
                  </Td>
                </Tr>
              ) : (
                ultimosPedidos.map((pedido) => (
                  <Tr
                    key={pedido.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Abrir pedido ${pedido.id}`}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
                    onClick={() => abrirPedido(pedido.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        abrirPedido(pedido.id);
                      }
                    }}
                  >
                    <Td className="font-bold text-zinc-900">#{pedido.id}</Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-800">
                          {getClienteNome(pedido)}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {formatDateTime(pedido.criado_em)}
                        </span>
                      </div>
                    </Td>
                    <Td>{renderStatusBadge(pedido.status)}</Td>
                    <Td className="text-right font-medium text-zinc-900">
                      {formatCurrency(pedido.total_estimado_snapshot)}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-base font-bold text-zinc-800 sm:text-lg">
            Ações rápidas
          </h2>

          <Card padding="lg" className="flex flex-col gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => router.push("/admin/brinquedos/novo")}
              className="group flex w-full items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 text-left transition-colors hover:border-teal-600 hover:bg-teal-50 sm:px-4 sm:py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                +
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900">
                  Novo brinquedo
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  Adicionar ao catálogo
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin/brinquedos")}
              className="group flex w-full items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 text-left transition-colors hover:border-amber-500 hover:bg-amber-50 sm:px-4 sm:py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                !
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900">
                  Atualizar estoque
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {dashboard
                    ? `${pluralize(unidades?.em_manutencao ?? 0, "unidade", "unidades")} em manutenção`
                    : "Gerenciar unidades físicas"}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin/contrato")}
              className="group flex w-full items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 text-left transition-colors hover:border-teal-600 hover:bg-teal-50 sm:px-4 sm:py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                C
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900">
                  Contrato de locação
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  Editar contrato vigente
                </span>
              </div>
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
