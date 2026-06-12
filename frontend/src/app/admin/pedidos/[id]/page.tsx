"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  confirmarAdminPedido,
  iniciarLocacaoAdminPedido,
  obterAdminPedido,
  registrarRetiradaAdminPedido,
  reservarUnidadesAdminPedido,
} from "@/services/adminPedidos";
import type { ApiError, ApiErrorData } from "@/types/api";
import type {
  AdminPedidoAction,
  AdminPedidoDetail,
  AdminPedidoItem,
} from "@/types/adminPedidos";

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

function getPedidoId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function collectErrorMessages(data: ApiErrorData): string[] {
  if (typeof data === "string") {
    return [data];
  }

  if (Array.isArray(data)) {
    return data.filter((item): item is string => typeof item === "string");
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  return Object.values(data).flatMap((value) => {
    if (typeof value === "string") {
      return [value];
    }

    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }

    return [];
  });
}

function getDetalhePedidoErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 401) {
      return "Voce precisa estar autenticado para acessar o detalhe administrativo.";
    }

    if (error.status === 403) {
      return "Seu usuario nao tem permissao de admin/staff para acessar este pedido.";
    }

    if (error.status === 404) {
      return "Pedido administrativo nao encontrado.";
    }

    return error.message;
  }

  return "Nao foi possivel carregar o pedido administrativo agora.";
}

function getAdminActionErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 401) {
      return "Voce precisa estar autenticado para executar esta acao administrativa.";
    }

    if (error.status === 403) {
      return "Seu usuario nao tem permissao de admin/staff para executar esta acao.";
    }

    const messages = collectErrorMessages(error.data);
    if (messages.length > 0) {
      return messages.join(" ");
    }

    return error.message;
  }

  return "Nao foi possivel executar a acao administrativa agora.";
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

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

function getClienteNome(pedido: AdminPedidoDetail) {
  return pedido.cliente?.nome || pedido.cliente_snapshot.nome || "Cliente sem nome";
}

function getEnderecoLinhaPrincipal(pedido: AdminPedidoDetail) {
  const endereco = pedido.endereco_entrega;
  const partes = [endereco.logradouro, endereco.numero].filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : "Endereco nao informado";
}

function getEnderecoLinhaCidade(pedido: AdminPedidoDetail) {
  const endereco = pedido.endereco_entrega;
  const cidadeUf = [endereco.cidade, endereco.uf].filter(Boolean).join("/");
  const partes = [endereco.bairro, cidadeUf].filter(Boolean);
  return partes.length > 0 ? partes.join(" - ") : "-";
}

function getItemComposicaoLabel(item: AdminPedidoItem) {
  const composicao = item.resumo_composicao;

  if (composicao.brinquedo) {
    return composicao.brinquedo.nome;
  }

  if (composicao.kit_festa) {
    return composicao.kit_festa.nome;
  }

  if (composicao.configuracao) {
    return composicao.configuracao.nome;
  }

  return item.nome_snapshot;
}

const renderStatusBadge = (status: AdminPedidoDetail["status"]) => {
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

const actionConfig: Record<
  AdminPedidoAction,
  {
    label: string;
    confirmMessage: string;
    successMessage: string;
    run: (pedidoId: string) => Promise<unknown>;
  }
> = {
  reservar_unidades: {
    label: "Reservar unidades",
    confirmMessage: "Reservar as unidades deste pedido agora?",
    successMessage: "Unidades reservadas com sucesso.",
    run: reservarUnidadesAdminPedido,
  },
  confirmar: {
    label: "Confirmar pedido",
    confirmMessage: "Confirmar este pedido agora?",
    successMessage: "Pedido confirmado com sucesso.",
    run: confirmarAdminPedido,
  },
  iniciar_locacao: {
    label: "Iniciar locacao",
    confirmMessage: "Iniciar a locacao deste pedido agora?",
    successMessage: "Locacao iniciada com sucesso.",
    run: iniciarLocacaoAdminPedido,
  },
  registrar_retirada: {
    label: "Registrar retirada",
    confirmMessage: "Registrar a retirada deste pedido agora?",
    successMessage: "Retirada registrada com sucesso.",
    run: registrarRetiradaAdminPedido,
  },
};

export default function DetalhePedidoPage() {
  const params = useParams();
  const router = useRouter();
  const pedidoId = getPedidoId(params.id);
  const [pedido, setPedido] = useState<AdminPedidoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [executingAction, setExecutingAction] = useState<AdminPedidoAction | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    async function carregarPedidoInicial() {
      if (!pedidoId || !/^\d+$/.test(pedidoId)) {
        setPedido(null);
        setError("Pedido administrativo nao encontrado.");
        setErrorStatus(404);
        setSuccessMessage(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setErrorStatus(null);
      setSuccessMessage(null);

      try {
        const data = await obterAdminPedido(pedidoId);

        if (!active) {
          return;
        }

        setPedido(data);
      } catch (err) {
        if (!active) {
          return;
        }

        setPedido(null);
        setError(getDetalhePedidoErrorMessage(err));
        setErrorStatus(isApiError(err) ? err.status : null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarPedidoInicial();

    return () => {
      active = false;
    };
  }, [pedidoId]);

  const acoesDisponiveis = useMemo(
    () => pedido?.acoes_disponiveis ?? [],
    [pedido?.acoes_disponiveis],
  );

  async function handleAction(acao: AdminPedidoAction) {
    if (!pedidoId || !/^\d+$/.test(pedidoId)) {
      setError("Pedido administrativo nao encontrado.");
      setErrorStatus(404);
      return;
    }

    const config = actionConfig[acao];
    const confirmed = window.confirm(config.confirmMessage);

    if (!confirmed) {
      return;
    }

    setExecutingAction(acao);
    setError(null);
    setErrorStatus(null);
    setSuccessMessage(null);

    try {
      await config.run(pedidoId);
      const data = await obterAdminPedido(pedidoId);
      setPedido(data);
      setSuccessMessage(config.successMessage);
    } catch (err) {
      setError(getAdminActionErrorMessage(err));
      setErrorStatus(isApiError(err) ? err.status : null);
    } finally {
      setExecutingAction(null);
    }
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <button
            onClick={() => router.push("/admin/pedidos")}
            className="mb-2 block text-sm font-semibold text-teal-600 hover:underline"
          >
            Voltar para a listagem
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">
              Pedido #{pedido?.id ?? pedidoId ?? "-"}
            </h1>
            {pedido && renderStatusBadge(pedido.status)}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {loading && "Carregando detalhe administrativo..."}
            {!loading && pedido && `Realizado em ${formatDateTime(pedido.criado_em)}`}
            {!loading && !pedido && "Detalhe administrativo indisponivel."}
          </p>
        </div>

        {pedido && (
          <div className="flex flex-wrap items-center gap-3 self-start rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:self-auto">
            {acoesDisponiveis.length > 0 ? (
              acoesDisponiveis.map((acao) => (
                <Button
                  key={acao}
                  variant="outline"
                  loading={executingAction === acao}
                  disabled={executingAction !== null}
                  onClick={() => void handleAction(acao)}
                >
                  {actionConfig[acao]?.label ?? acao}
                </Button>
              ))
            ) : (
              <span className="text-xs font-medium text-zinc-500">
                Nenhuma acao disponivel
              </span>
            )}
            <span className="text-xs font-medium text-zinc-500">
              O backend valida cada acao
            </span>
          </div>
        )}
      </div>

      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700"
        >
          {successMessage}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
        >
          {error}
          {errorStatus === 401 && (
            <div className="mt-3">
              <Button size="sm" onClick={() => router.push("/login?next=/admin/pedidos")}>
                Ir para login
              </Button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <Card padding="lg">
          <p className="text-sm text-zinc-500">Carregando pedido administrativo...</p>
        </Card>
      )}

      {!loading && pedido && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card padding="lg">
              <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-bold text-zinc-800">
                Itens do pedido
              </h2>
              <div className="flex flex-col divide-y divide-zinc-100">
                {pedido.itens.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nenhum item encontrado.</p>
                ) : (
                  pedido.itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 sm:text-base">
                          {item.nome_snapshot}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                          <span>
                            Tipo:{" "}
                            <strong className="text-zinc-700">{item.tipo_item}</strong>
                          </span>
                          <span>
                            Quantidade:{" "}
                            <strong className="text-zinc-700">{item.quantidade}</strong>
                          </span>
                          <span>
                            Unitario:{" "}
                            <strong className="text-zinc-700">
                              {formatCurrency(item.preco_unitario_snapshot)}
                            </strong>
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          Composicao: {getItemComposicaoLabel(item)}
                        </p>
                      </div>
                      <span className="whitespace-nowrap font-bold text-zinc-900">
                        {formatCurrency(item.subtotal_snapshot)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card padding="lg">
              <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-bold text-zinc-800">
                Resumo financeiro
              </h2>
              <div className="flex flex-col gap-3 text-sm text-zinc-600">
                <div className="flex justify-between gap-4">
                  <span>Subtotal dos itens</span>
                  <span className="font-medium text-zinc-900">
                    {formatCurrency(pedido.valores.subtotal_itens_snapshot)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Taxa de entrega e retirada</span>
                  <span className="font-medium text-zinc-900">
                    {formatCurrency(pedido.valores.taxa_entrega_retirada_snapshot)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between gap-4 border-t border-zinc-100 pt-3 text-base font-bold text-zinc-900">
                  <span>Total estimado</span>
                  <span className="text-lg text-teal-600">
                    {formatCurrency(pedido.valores.total_estimado_snapshot)}
                  </span>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-bold text-zinc-800">
                Contrato e aceite
              </h2>
              {pedido.aceite_contrato ? (
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <Field label="Contrato" value={`#${pedido.aceite_contrato.contrato}`} />
                  <Field label="Titulo aceito" value={pedido.aceite_contrato.titulo_aceito} />
                  <Field label="Versao aceita" value={pedido.aceite_contrato.versao_aceita} />
                  <Field label="Aceito em" value={formatDateTime(pedido.aceite_contrato.aceito_em)} />
                  <Field label="Nome no aceite" value={pedido.aceite_contrato.nome_cliente_snapshot} />
                  <Field label="E-mail no aceite" value={pedido.aceite_contrato.email_cliente_snapshot} />
                  <details className="sm:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                      Ver texto aceito
                    </summary>
                    <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                      {pedido.aceite_contrato.texto_aceito}
                    </div>
                  </details>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Nenhum aceite de contrato registrado.</p>
              )}
            </Card>

            <Card padding="lg">
              <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-bold text-zinc-800">
                Reservas e unidades
              </h2>
              {pedido.reservas.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhuma reserva de unidade registrada.</p>
              ) : (
                <div className="flex flex-col divide-y divide-zinc-100">
                  {pedido.reservas.map((reserva) => (
                    <div
                      key={reserva.id}
                      className="grid grid-cols-1 gap-2 py-4 text-sm first:pt-0 last:pb-0 sm:grid-cols-4"
                    >
                      <div>
                        <span className="block text-xs font-semibold text-zinc-400">
                          Reserva
                        </span>
                        <span className="font-medium text-zinc-900">#{reserva.id}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-zinc-400">
                          Brinquedo
                        </span>
                        <span className="text-zinc-800">{reserva.brinquedo.nome}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-zinc-400">
                          Unidade
                        </span>
                        <span className="text-zinc-800">
                          {reserva.unidade.codigo} ({reserva.unidade.status})
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-zinc-400">
                          Periodo
                        </span>
                        <span className="text-zinc-800">
                          {formatDate(reserva.data_inicio)} ate {formatDate(reserva.data_fim)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pedido.unidades_reservadas.length > 0 && (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <h3 className="mb-2 text-sm font-bold text-zinc-800">
                    Unidades reservadas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {pedido.unidades_reservadas.map((unidade) => (
                      <span
                        key={unidade.id}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700"
                      >
                        {unidade.codigo} - {unidade.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card padding="lg">
              <h2 className="mb-3 border-b border-zinc-100 pb-2 text-base font-bold text-zinc-800">
                Dados do cliente
              </h2>
              <div className="flex flex-col gap-3 text-sm">
                <Field label="Nome" value={getClienteNome(pedido)} />
                <Field label="E-mail" value={pedido.cliente_snapshot.email} />
                <Field label="Telefone" value={pedido.cliente_snapshot.telefone} />
                <Field
                  label="Cliente vinculado"
                  value={pedido.cliente ? `#${pedido.cliente.id} - ${pedido.cliente.nome}` : "Sem cliente vinculado"}
                />
              </div>
            </Card>

            <Card padding="lg">
              <h2 className="mb-3 border-b border-zinc-100 pb-2 text-base font-bold text-zinc-800">
                Endereco de entrega
              </h2>
              <div className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-zinc-800">
                  {getEnderecoLinhaPrincipal(pedido)}
                </span>
                {pedido.endereco_entrega.complemento && (
                  <span className="text-xs text-zinc-600">
                    {pedido.endereco_entrega.complemento}
                  </span>
                )}
                <span className="text-xs text-zinc-600">
                  {getEnderecoLinhaCidade(pedido)}
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  {pedido.endereco_entrega.cep || "-"}
                </span>
              </div>
            </Card>

            <Card padding="lg">
              <h2 className="mb-3 border-b border-zinc-100 pb-2 text-base font-bold text-zinc-800">
                Datas
              </h2>
              <div className="flex flex-col gap-3 text-sm">
                <Field label="Data do evento" value={formatDate(pedido.data_evento_pretendida)} />
                <Field label="Inicio da locacao" value={formatDate(pedido.data_inicio_locacao)} />
                <Field label="Fim da locacao" value={formatDate(pedido.data_fim_locacao)} />
                <Field label="Atualizado em" value={formatDateTime(pedido.atualizado_em)} />
              </div>
            </Card>

            <Card padding="lg">
              <h2 className="mb-3 border-b border-zinc-100 pb-2 text-base font-bold text-zinc-800">
                Observacoes
              </h2>
              <p className="text-sm text-zinc-700">
                {pedido.observacoes_cliente || "Nenhuma observacao informada."}
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs font-semibold text-zinc-400">{label}</span>
      <span className="break-words text-zinc-800">{value || "-"}</span>
    </div>
  );
}
