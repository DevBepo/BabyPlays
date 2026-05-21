"use client";

import { useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const mockDetalhePedido = {
  id: "1042",
  dataCriacao: "16/05/2026 as 14:32",
  status: "aguardando_analise",
  cliente: {
    nome: "Camila Rodrigues Nunes",
    email: "camila.nunes@email.com",
    telefone: "(51) 99999-1234",
  },
  entrega: {
    logradouro: "Avenida Sete de Setembro",
    numero: "1540",
    complemento: "Ap 302",
    bairro: "Centro",
    cidade: "Guaiba",
    estado: "RS",
    cep: "92700-000",
  },
  valores: {
    subtotalItens: 180.00,
    taxaEntregaRetirada: 25.90,
    totalEstimado: 205.90,
  },
  itens: [
    {
      id: "b1",
      nome: "Cadeira de Balanco Fisher Price Mimo",
      tipo: "brinquedo",
      quantidade: 1,
      precoUnitario: 110.00,
      subtotal: 110.00,
    },
    {
      id: "b2",
      nome: "Cubo Didatico de Atividades em Madeira",
      tipo: "brinquedo",
      quantidade: 1,
      precoUnitario: 70.00,
      subtotal: 70.00,
    },
  ],
  acoesDisponiveis: ["reservar_unidades"],
};

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

const actionLabels: Record<string, string> = {
  reservar_unidades: "Reservar unidades",
  confirmar: "Confirmar pedido",
  iniciar_locacao: "Iniciar locacao",
  registrar_retirada: "Registrar retirada",
};

export default function DetalhePedidoPage() {
  const params = useParams();
  const router = useRouter();
  const pedidoId = params.id || mockDetalhePedido.id;

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm font-semibold text-teal-600 hover:underline mb-2 block"
          >
            Voltar para a listagem
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">Pedido #{pedidoId}</h1>
            {renderStatusBadge(mockDetalhePedido.status)}
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Realizado em {mockDetalhePedido.dataCriacao}
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {mockDetalhePedido.acoesDisponiveis.map((acao) => (
            <Button key={acao} variant="outline" disabled>
              {actionLabels[acao] ?? acao}
            </Button>
          ))}
          <span className="text-xs font-medium text-zinc-500">
            Acoes ainda nao integradas
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card padding="lg">
            <h2 className="text-lg font-bold text-zinc-800 mb-4 border-b border-zinc-100 pb-2">
              Itens do pedido
            </h2>
            <div className="flex flex-col divide-y divide-zinc-100">
              {mockDetalhePedido.itens.map((item) => (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-sm sm:text-base">
                      {item.nome}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span>Tipo: <strong className="text-zinc-700">{item.tipo}</strong></span>
                      <span>Quantidade: <strong className="text-zinc-700">{item.quantidade}</strong></span>
                      <span>Unitario: <strong className="text-zinc-700">R$ {item.precoUnitario.toFixed(2).replace(".", ",")}</strong></span>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-900 whitespace-nowrap">
                    R$ {item.subtotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="text-lg font-bold text-zinc-800 mb-4 border-b border-zinc-100 pb-2">
              Resumo financeiro
            </h2>
            <div className="flex flex-col gap-3 text-sm text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal dos itens</span>
                <span className="font-medium text-zinc-900">
                  R$ {mockDetalhePedido.valores.subtotalItens.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de entrega e retirada</span>
                <span className="font-medium text-zinc-900">
                  R$ {mockDetalhePedido.valores.taxaEntregaRetirada.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-3 border-t border-zinc-100 mt-1">
                <span>Total estimado</span>
                <span className="text-lg text-teal-600">
                  R$ {mockDetalhePedido.valores.totalEstimado.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card padding="lg">
            <h2 className="text-base font-bold text-zinc-800 mb-3 border-b border-zinc-100 pb-2">
              Dados do cliente
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="text-xs font-semibold text-zinc-400 block">Nome</span>
                <span className="text-zinc-800 font-medium">{mockDetalhePedido.cliente.nome}</span>
              </div>
              <div className="mt-1">
                <span className="text-xs font-semibold text-zinc-400 block">E-mail</span>
                <span className="text-zinc-800 break-all">{mockDetalhePedido.cliente.email}</span>
              </div>
              <div className="mt-1">
                <span className="text-xs font-semibold text-zinc-400 block">Telefone</span>
                <span className="text-zinc-800">{mockDetalhePedido.cliente.telefone}</span>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="text-base font-bold text-zinc-800 mb-3 border-b border-zinc-100 pb-2">
              Endereco de entrega
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="text-xs font-semibold text-zinc-400 block">Destino</span>
                <span className="text-zinc-800 block font-medium">
                  {mockDetalhePedido.entrega.logradouro}, {mockDetalhePedido.entrega.numero}
                </span>
                {mockDetalhePedido.entrega.complemento && (
                  <span className="text-zinc-600 text-xs block">{mockDetalhePedido.entrega.complemento}</span>
                )}
                <span className="text-zinc-600 text-xs block">
                  {mockDetalhePedido.entrega.bairro} - {mockDetalhePedido.entrega.cidade}/{mockDetalhePedido.entrega.estado}
                </span>
                <span className="text-zinc-500 text-xs font-mono block mt-0.5">{mockDetalhePedido.entrega.cep}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
