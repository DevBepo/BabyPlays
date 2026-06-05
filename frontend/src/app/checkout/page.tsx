"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/client/Header";
import { converterCarrinhoEmPedido } from "@/services/cart";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/TextArea";

export default function CheckoutPage() {
  const router = useRouter();
  const { carrinho, refreshCart, cartLoading } = useCart();
  
  
  const { user, cliente, isAuthenticated } = useAuth();

  // Estados dos Dados Pessoais
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // Estados de Endereço
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Estados de Datas
  const [dataEvento, setDataEvento] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [loadingPedido, setLoadingPedido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Redirecionamento e Pré-preenchimento
  useEffect(() => {
    // Se a página carregou e não está autenticado, manda pro login
    if (!isAuthenticated) {
      router.push("/login?redirect=/checkout");
    } else {
      setNome(cliente?.nome || "");
      setEmail(user?.email || "");
      setTelefone(cliente?.telefone || "");
    }
  }, [isAuthenticated, router, cliente, user]);

  const handleFinalizarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (new Date(dataInicio) >= new Date(dataFim)) {
      setErro("A data de devolução deve ser posterior à data de início.");
      return;
    }

    setLoadingPedido(true);

    try {
      await converterCarrinhoEmPedido({
        nome,
        email,
        telefone,
        cep: cep.replace(/\D/g, ""), 
        numero,
        complemento,
        observacoes,
        data_evento_pretendida: dataEvento,
        data_inicio_locacao: dataInicio,
        data_fim_locacao: dataFim,
      });

      await refreshCart();
      alert("Pedido realizado com sucesso! 🎉 A taxa de entrega será calculada no seu resumo de pedido no painel.");
      router.push("/"); 
    } catch (err: any) {
      console.error("Erro ao converter pedido:", err);
      const mensagemErro = err?.message || "Ocorreu um erro ao processar seu pedido. Verifique os dados e tente novamente.";
      setErro(mensagemErro);
    } finally {
      setLoadingPedido(false);
    }
  };

  const quantidadeCarrinho = carrinho?.itens.reduce((acc, item) => acc + item.quantidade, 0) || 0;
  const valorTotal = carrinho?.itens.reduce((acc, item) => acc + parseFloat(item.subtotal_snapshot), 0) || 0;

  // REMOVIDO o userLoading daqui também
  if (cartLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 animate-pulse font-medium">A preparar o seu checkout...</p>
        </main>
      </div>
    );
  }

  if (quantidadeCarrinho === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-10 text-center flex flex-col items-center max-w-md w-full">
            <h2 className="text-2xl font-bold text-zinc-800 mb-2">Carrinho Vazio</h2>
            <p className="text-zinc-500 mb-6">Não há itens para finalizar. Vamos escolher alguns brinquedos?</p>
            <Link href="/" className="px-6 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors w-full">
              Voltar para a Loja
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const hoje = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Header />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10">
        <h1 className="text-3xl font-black text-zinc-900 mb-8">Finalizar Pedido</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="w-full lg:w-2/3 flex flex-col gap-6">
            
            {erro && (
              <div className="p-4 bg-red-50 text-red-600 font-medium rounded-xl border border-red-100">
                {erro}
              </div>
            )}

            <form id="checkout-form" onSubmit={handleFinalizarPedido} className="flex flex-col gap-6">
              
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 md:p-8">
                <h2 className="text-xl font-bold text-zinc-900 mb-6 pb-4 border-b border-zinc-100">1. Os seus dados</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Input label="Nome Completo *" value={nome} onChange={(e) => setNome(e.target.value)} required />
                  </div>
                  <Input label="E-mail *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input label="Telefone *" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" required />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 md:p-8">
                <h2 className="text-xl font-bold text-zinc-900 mb-6 pb-4 border-b border-zinc-100">2. Datas do Evento</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Input label="Data da Festa/Evento *" type="date" value={dataEvento} min={hoje} onChange={(e) => setDataEvento(e.target.value)} required />
                  </div>
                  <Input label="Receber os brinquedos em *" type="date" value={dataInicio} min={hoje} onChange={(e) => setDataInicio(e.target.value)} required />
                  <Input label="Devolver os brinquedos em *" type="date" value={dataFim} min={dataInicio || hoje} onChange={(e) => setDataFim(e.target.value)} required />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 md:p-8">
                <h2 className="text-xl font-bold text-zinc-900 mb-6 pb-4 border-b border-zinc-100">3. Local de Entrega</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <Input label="CEP *" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" maxLength={9} required />
                  </div>
                  <div className="md:col-span-1">
                    <Input label="Número *" value={numero} onChange={(e) => setNumero(e.target.value)} required />
                  </div>
                  <div className="md:col-span-1">
                    <Input label="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, Bloco..." />
                  </div>
                  <div className="md:col-span-3">
                    <Textarea label="Observações de Entrega" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Ex: Deixar na portaria, campainha estragada..." />
                  </div>
                </div>
              </div>

            </form>
          </div>

          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 sticky top-28">
              <h2 className="text-xl font-bold text-zinc-900 mb-6 pb-4 border-b border-zinc-100">Resumo do Pedido</h2>
              
              <div className="flex flex-col gap-4 mb-6">
                {carrinho?.itens.map((item) => (
                  <div key={item.id} className="flex justify-between items-start text-sm">
                    <span className="text-zinc-600 flex-1 pr-4">
                      {item.quantidade}x {item.nome_snapshot}
                    </span>
                    <span className="font-bold text-zinc-900 whitespace-nowrap">
                      R$ {item.subtotal_snapshot}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-50 p-4 rounded-xl mb-6 border border-zinc-100">
                <div className="flex justify-between items-center text-sm text-zinc-600 mb-2">
                  <span>Subtotal itens</span>
                  <span>R$ {valorTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-zinc-600 mb-2">
                  <span>Frete / Logística</span>
                  <span className="text-xs font-bold text-amber-600">Calculado a seguir</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-zinc-200 mt-3">
                  <span className="text-zinc-800 font-bold">Total Parcial</span>
                  <span className="text-2xl font-black text-teal-600">
                    R$ {valorTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={loadingPedido}
                className="w-full py-4 bg-[#FF5A5F] hover:bg-[#ff444a] text-white text-lg font-bold rounded-xl transition-colors shadow-md shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingPedido ? (
                  <>
                    <span className="block w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    A processar...
                  </>
                ) : (
                  "Confirmar Dados"
                )}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}