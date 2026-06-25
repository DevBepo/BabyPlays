"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { removerItemCarrinho, converterCarrinhoEmPedido } from "@/services/cart";
import { obterContratoVigente } from "@/services/contrato";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal"; // Importando o nosso Modal
import { resolveMediaUrl } from "@/lib/media-url";
import type { ContratoLocacao } from "@/types/contrato"; // Importando a tipagem

export function SidebarCart() {
  const router = useRouter();
  const { carrinho, closeCart, refreshCart, cartLoading } = useCart();
  const { user, cliente, isAuthenticated } = useAuth();
  
  // Estados de Datas e Contrato
  const [contratoAceito, setContratoAceito] = useState(false);
  const [contratoVigente, setContratoVigente] = useState<ContratoLocacao | null>(null);
  const [modalContratoAberto, setModalContratoAberto] = useState(false); 

  
  const [expandirDados, setExpandirDados] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [loadingPedido, setLoadingPedido] = useState(false);

  // Carregar os dados do usuário logado E o contrato vigente
  useEffect(() => {
    if (isAuthenticated) {
      queueMicrotask(() => {
        setNome(cliente?.nome || "");
        setEmail(user?.email || "");
        setTelefone(cliente?.telefone || "");
      });
    }

    // Buscar o contrato ativo para sabermos qual ID e Versão mandar no Checkout
    obterContratoVigente()
      .then((dados) => setContratoVigente(dados))
      .catch((err) => console.error("Erro ao carregar o contrato vigente:", err));
  }, [isAuthenticated, cliente, user]);

  // Derivações do carrinho
  const itens = carrinho?.itens || [];
  const quantidadeTotal = itens.reduce((acc, item) => acc + item.quantidade, 0);
  const subtotal = itens.reduce((acc, item) => acc + parseFloat(item.subtotal_snapshot), 0);
  
  // Frete fixo/simulado provisório
  const valorFrete = 18.50; 
  const total = subtotal > 0 ? subtotal + valorFrete : 0;

  const handleRemoverItem = async (id: number) => {
    try {
      await removerItemCarrinho(id);
      await refreshCart();
    } catch (err) {
      console.error("Erro ao remover item", err);
    }
  };

  const handleFinalizarReserva = async () => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/");
      return;
    }

    if (!cep || !numero || !nome || !telefone) {
      setExpandirDados(true);
      alert("Por favor, preencha todos os campos obrigatórios na secção de Entrega e Contato.");
      return;
    }

    if (!contratoAceito) {
      alert("Para continuar, é necessário aceitar o contrato de locação.");
      return;
    }

    if (!contratoVigente) {
      alert("Erro ao obter a versão atual do contrato. Tente atualizar a página.");
      return;
    }

    setLoadingPedido(true);
    try {
      const pedido = await converterCarrinhoEmPedido({
        nome,
        email,
        telefone,
        cep: cep.replace(/\D/g, ""),
        numero,
        complemento,
        observacoes: "",
        
        contrato_aceito: contratoAceito,
        contrato_id: contratoVigente.id,
        contrato_versao: contratoVigente.versao,
      });

      await refreshCart();
      setCep(""); setNumero(""); setComplemento(""); setContratoAceito(false); setExpandirDados(false);
      const whatsapp = process.env.NEXT_PUBLIC_BABYPLAYS_WHATSAPP?.replace(/\D/g, "");
      if (!whatsapp) {
        alert(`Pedido #${pedido.id} salvo com sucesso, mas o WhatsApp da BabyPlays não está configurado.`);
        return;
      }
      window.location.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(pedido.whatsapp_resumo)}`;
    } catch (err: unknown) {
      console.error("Erro ao converter pedido:", err);
      const mensagem =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Ocorreu um erro ao processar a sua reserva.";
      alert(mensagem);
    } finally {
      setLoadingPedido(false);
    }
  };

  if (cartLoading) {
    return (
      <aside className="fixed inset-y-0 right-0 z-50 h-dvh w-full max-w-sm animate-pulse border border-zinc-200 bg-white p-5 shadow-xl lg:sticky lg:inset-auto lg:top-[104px] lg:z-auto lg:h-[600px] lg:w-auto lg:max-w-none lg:self-start lg:rounded-xl lg:shadow-sm lg:max-h-[calc(100vh-120px)]">
        <div className="h-6 bg-zinc-100 rounded w-1/2 mb-8"></div>
        <div className="space-y-4"><div className="h-20 bg-zinc-50 rounded"></div></div>
      </aside>
    );
  }

  return (
    <>
      <aside id="reserva" className="custom-scrollbar fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-sm flex-col gap-6 overflow-y-auto border border-zinc-200 bg-white p-5 shadow-2xl lg:sticky lg:inset-auto lg:top-[104px] lg:z-auto lg:h-auto lg:w-auto lg:max-w-none lg:self-start lg:scroll-mt-28 lg:rounded-xl lg:shadow-sm lg:max-h-[calc(100vh-120px)]">
        
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <h2 className="text-lg font-bold text-zinc-900">Seu carrinho ({quantidadeTotal})</h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Fechar resumo do carrinho"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span aria-hidden="true">×</span>
            Fechar
          </button>
        </div>

        <div className="custom-scrollbar flex max-h-[280px] min-h-0 shrink-0 flex-col gap-4 overflow-y-auto pr-2">
          {itens.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">Seu carrinho está vazio.</p>
          ) : (
            itens.map((item) => {
              const imagemUrl = resolveMediaUrl(item.imagem_url);

              return (
              <div key={item.id} className="relative flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
                <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white">
                  {imagemUrl ? (
                    <img
                      src={imagemUrl}
                      alt={item.nome_snapshot}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-[10px] text-zinc-400">Sem imagem</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col pr-7">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-800">{item.nome_snapshot}</h3>
                  <span className="text-[11px] text-zinc-500 mt-0.5">
                    {item.quantidade}x • {item.snapshot.periodo_locacao?.label || "15 dias"}
                  </span>
                  <span className="text-sm font-bold text-zinc-900 mt-1">
                    R$ {item.subtotal_snapshot.replace(".", ",")}
                  </span>
                </div>
                <button 
                  onClick={() => handleRemoverItem(item.id)}
                  className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 p-1"
                >
                  ✕
                </button>
              </div>
              );
            })
          )}
        </div>

        <div className="rounded-lg border border-violet-100 bg-violet-50 p-3 text-xs leading-5 text-violet-900">
          As datas exatas da locação serão confirmadas pelo WhatsApp após o envio do pedido.
        </div>

        <div className="flex flex-col border-t border-zinc-100 pt-4">
          <button 
            onClick={() => setExpandirDados(!expandirDados)}
            className="flex items-center justify-between w-full text-left group"
          >
            <h3 className="text-sm font-bold text-zinc-800 group-hover:text-teal-600 transition-colors">
              Dados de Entrega e Contato
            </h3>
            <span className={`text-zinc-400 transition-transform ${expandirDados ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          {expandirDados && (
            <div className="flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nome Completo *" value={nome} onChange={(e) => setNome(e.target.value)} className="text-xs py-2 col-span-2" />
                <Input placeholder="E-mail *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="text-xs py-2 col-span-2" />
                <Input placeholder="Telefone *" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="text-xs py-2 col-span-2" />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="col-span-1">
                  <Input placeholder="CEP *" value={cep} onChange={(e) => setCep(e.target.value)} maxLength={9} className="text-xs py-2" />
                </div>
                <div className="col-span-1">
                  <Input placeholder="Número *" value={numero} onChange={(e) => setNumero(e.target.value)} className="text-xs py-2" />
                </div>
                <div className="col-span-1">
                  <Input placeholder="Comp." value={complemento} onChange={(e) => setComplemento(e.target.value)} className="text-xs py-2" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
          <h3 className="text-sm font-bold text-zinc-800">Resumo do pedido</h3>
          <div className="flex justify-between text-sm text-zinc-600">
            <span>Subtotal ({quantidadeTotal} itens)</span>
            <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
          </div>
          <div className="flex justify-between text-sm text-zinc-600">
            <span>Frete estimado</span>
            <span>R$ {valorFrete.toFixed(2).replace(".", ",")}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-base font-bold text-zinc-900">Total</span>
            <span className="text-lg font-black text-teal-600">R$ {total.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={contratoAceito} 
                onChange={(e) => setContratoAceito(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded border-zinc-300 focus:ring-teal-500" 
              />
              <span className="text-sm font-bold text-zinc-800">Contrato aceito</span>
            </label>
            <button 
              type="button" 
              onClick={() => setModalContratoAberto(true)} 
              className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
            >
              Ver contrato
            </button>
          </div>

          <button 
            onClick={handleFinalizarReserva}
            disabled={itens.length === 0 || loadingPedido}
            className="w-full py-3.5 bg-[#FF5A5F] hover:bg-[#ff444a] text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingPedido ? (
              <span className="block w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              "Finalizar reserva"
            )}
          </button>
          
          <p className="text-[11px] text-zinc-500 text-center flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Ambiente seguro e seus dados protegidos
          </p>
        </div>
      </aside>

      {/* MODAL DE CONTRATO */}
      <Modal
        isOpen={modalContratoAberto}
        onClose={() => setModalContratoAberto(false)}
        title={contratoVigente?.titulo || "Contrato de Locação"}
        size="lg"
      >
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar border-y border-zinc-100 py-4 mb-4 mt-2">
          <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
            {contratoVigente?.texto ? contratoVigente.texto : "A carregar o texto do contrato..."}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setModalContratoAberto(false)}
            className="px-4 py-2.5 rounded-xl font-bold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => {
              setContratoAceito(true);
              setModalContratoAberto(false);
            }}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors"
          >
            Aceitar Contrato
          </button>
        </div>
      </Modal>
    </>
  );
}
