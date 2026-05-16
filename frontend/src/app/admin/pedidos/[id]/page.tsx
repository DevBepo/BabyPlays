"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

// Dados simulados detalhados de um pedido específico
const mockDetalhePedido = {
  id: "1042",
  dataCriacao: "16/05/2026 às 14:32",
  status: "AGUARDANDO_PAGAMENTO",
  cliente: {
    nome: "Camila Rodrigues Nunes",
    email: "camila.nunes@email.com",
    telefone: "(51) 99999-1234",
    cpf: "123.456.789-00",
  },
  entrega: {
    logradouro: "Avenida Sete de Setembro",
    numero: "1540",
    complemento: "Ap 302",
    bairro: "Centro",
    cidade: "Guaíba",
    estado: "RS",
    cep: "92700-000",
    metodo: "Entrega Própria - BabyPlays",
    previsao: "20/05/2026",
  },
  valores: {
    subtotal: 180.00,
    frete: 25.90,
    caucao: 40.00, // Valor de garantia temporária
    total: 245.90,
  },
  itens: [
    {
      id: "b1",
      nome: "Cadeira de Balanço Fisher Price Mimo",
      categoria: "Primeira Infância",
      periodo: "30 dias",
      valorLocacao: 110.00,
    },
    {
      id: "b2",
      nome: "Cubo Didático de Atividades em Madeira",
      categoria: "Educativos",
      periodo: "30 dias",
      valorLocacao: 70.00,
    },
  ],
};

export default function DetalhePedidoPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState(mockDetalhePedido.status);
  const [loading, setLoading] = useState(false);

  const pedidoId = params.id || mockDetalhePedido.id;

  const handleSalvarStatus = () => {
    setLoading(true);
    console.log(`Atualizando pedido #${pedidoId} para o status: ${status}`);
    
    setTimeout(() => {
      setLoading(false);
      alert("Status do pedido atualizado com sucesso!");
    }, 1000);
  };

  const renderStatusBadge = (currentStatus: string) => {
    switch (currentStatus) {
      case "AGUARDANDO_PAGAMENTO":
        return <Badge variant="warning">Aguardando Pagamento</Badge>;
      case "EM_SEPARACAO":
        return <Badge variant="brand">Em Separação</Badge>;
      case "SAIU_ENTREGA":
        return <Badge variant="brand">Saiu para Entrega</Badge>;
      case "ENTREGUE":
        return <Badge variant="success">Entregue</Badge>;
      case "CANCELADO":
        return <Badge variant="default">Cancelado</Badge>;
      default:
        return <Badge variant="default">{currentStatus}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      
      {/* Barra Superior de Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.back()}
            className="text-sm font-semibold text-teal-600 hover:underline mb-2 block"
          >
            ← Voltar para a listagem
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">Pedido #{pedidoId}</h1>
            {renderStatusBadge(status)}
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Realizado em {mockDetalhePedido.dataCriacao}
          </p>
        </div>

        {/* Gerenciamento rápido de Status do Pedido */}
        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm flex items-center gap-3 self-start sm:self-auto">
          <div className="w-52">
            <Select
              placeholder="Alterar status..."
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "AGUARDANDO_PAGAMENTO", label: "Aguardando Pagamento" },
                { value: "EM_SEPARACAO", label: "Em Separação" },
                { value: "SAIU_ENTREGA", label: "Saiu para Entrega" },
                { value: "ENTREGUE", label: "Entregue" },
                { value: "CANCELADO", label: "Cancelar Pedido" },
              ]}
            />
          </div>
          <Button variant="primary" onClick={handleSalvarStatus} loading={loading}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna da Esquerda: Itens e Valores (Ocupa 2 colunas no desktop) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Card dos Itens do Pedido */}
          <Card padding="lg">
            <h2 className="text-lg font-bold text-zinc-800 mb-4 border-b border-zinc-100 pb-2">
              Itens Locados
            </h2>
            <div className="flex flex-col divide-y divide-zinc-100">
              {mockDetalhePedido.itens.map((item) => (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-sm sm:text-base">
                      {item.nome}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span>Categoria: <strong className="text-zinc-700">{item.categoria}</strong></span>
                      <span>•</span>
                      <span>Período: <strong className="text-zinc-700">{item.periodo}</strong></span>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-900 whitespace-nowrap">
                    R$ {item.valorLocacao.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Card de Resumo Financeiro */}
          <Card padding="lg">
            <h2 className="text-lg font-bold text-zinc-800 mb-4 border-b border-zinc-100 pb-2">
              Resumo Financeiro
            </h2>
            <div className="flex flex-col gap-3 text-sm text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal dos itens</span>
                <span className="font-medium text-zinc-900">R$ {mockDetalhePedido.valores.subtotal.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de Entrega/Logística</span>
                <span className="font-medium text-zinc-900">R$ {mockDetalhePedido.valores.frete.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-teal-600 font-medium">
                <span>Valor de Caução (Reembolsável)</span>
                <span>+ R$ {mockDetalhePedido.valores.caucao.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-3 border-t border-zinc-100 mt-1">
                <span>Valor Cobrado</span>
                <span className="text-lg text-teal-600">R$ {mockDetalhePedido.valores.total.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna da Direita: Dados do Cliente e Logística*/}
        <div className="flex flex-col gap-6">
          
          {/* Card do Cliente */}
          <Card padding="lg">
            <h2 className="text-base font-bold text-zinc-800 mb-3 border-b border-zinc-100 pb-2">
              Dados do Cliente
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="text-xs font-semibold text-zinc-400 block">Nome Completo</span>
                <span className="text-zinc-800 font-medium">{mockDetalhePedido.cliente.nome}</span>
              </div>
              <div className="mt-1">
                <span className="text-xs font-semibold text-zinc-400 block">CPF</span>
                <span className="text-zinc-800 font-mono">{mockDetalhePedido.cliente.cpf}</span>
              </div>
              <div className="mt-1">
                <span className="text-xs font-semibold text-zinc-400 block">E-mail</span>
                <span className="text-zinc-800 break-all">{mockDetalhePedido.cliente.email}</span>
              </div>
              <div className="mt-1">
                <span className="text-xs font-semibold text-zinc-400 block">Telefone / WhatsApp</span>
                <span className="text-zinc-800">{mockDetalhePedido.cliente.telefone}</span>
              </div>
            </div>
          </Card>

          {/* Card de Logística de Entrega */}
          <Card padding="lg">
            <h2 className="text-base font-bold text-zinc-800 mb-3 border-b border-zinc-100 pb-2">
              Endereço e Logística
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="text-xs font-semibold text-zinc-400 block">Endereço de Destino</span>
                <span className="text-zinc-800 block font-medium">
                  {mockDetalhePedido.entrega.logradouro}, {mockDetalhePedido.entrega.numero}
                </span>
                {mockDetalhePedido.entrega.complemento && (
                  <span className="text-zinc-600 text-xs block">{mockDetalhePedido.entrega.complemento}</span>
                )}
                <span className="text-zinc-600 text-xs block">
                  {mockDetalhePedido.entrega.bairro} — {mockDetalhePedido.entrega.cidade}/{mockDetalhePedido.entrega.estado}
                </span>
                <span className="text-zinc-500 text-xs font-mono block mt-0.5">{mockDetalhePedido.entrega.cep}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-100">
                <span className="text-xs font-semibold text-zinc-400 block">Método de Envio</span>
                <span className="text-zinc-800 font-medium text-xs">{mockDetalhePedido.entrega.metodo}</span>
              </div>
              <div className="mt-1">
                <span className="text-xs font-semibold text-zinc-400 block">Data Prevista para Ação</span>
                <span className="text-teal-600 font-bold">{mockDetalhePedido.entrega.previsao}</span>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}