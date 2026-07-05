"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { removerItemCarrinho, converterCarrinhoEmPedido } from "@/services/cart";
import { obterContratoVigente } from "@/services/contrato";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal"; // Importando o nosso Modal
import { getWhatsAppUrl } from "@/lib/contact-links";
import { resolveMediaUrl } from "@/lib/media-url";
import type { ContratoLocacao } from "@/types/contrato"; // Importando a tipagem

type SidebarCartProps = {
  variant?: "catalog" | "drawer";
};

type CheckoutError = {
  message: string;
  canRetry?: boolean;
};

const SHIPPING_ERROR_MESSAGE =
  "Não conseguimos calcular a taxa de entrega e retirada para esse endereço. Verifique o CEP, bairro e cidade informados ou fale com a BabyPlays pelo WhatsApp para confirmar a disponibilidade.";

function getCheckoutApiError(error: unknown): CheckoutError {
  const fallback =
    "Não foi possível finalizar sua solicitação agora. Tente novamente ou fale com a BabyPlays pelo WhatsApp.";

  if (typeof error !== "object" || error === null) {
    return { message: fallback, canRetry: true };
  }

  const apiError = error as {
    status?: unknown;
    message?: unknown;
    data?: unknown;
  };
  const data = apiError.data;

  if (data && typeof data === "object" && !Array.isArray(data) && "taxa_entrega" in data) {
    const shippingMessage =
      typeof data.taxa_entrega === "string" ? data.taxa_entrega.trim() : "";
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(shippingMessage);

    return {
      message:
        shippingMessage && !looksLikeHtml
          ? shippingMessage
          : SHIPPING_ERROR_MESSAGE,
      canRetry: true,
    };
  }

  const status = Number(apiError.status);
  const message = typeof apiError.message === "string" ? apiError.message.trim() : "";
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(message);

  if (status >= 400 && status < 500 && message && !looksLikeHtml) {
    return { message };
  }

  return { message: fallback, canRetry: true };
}

export function SidebarCart({ variant = "catalog" }: SidebarCartProps) {
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
  const [checkoutError, setCheckoutError] = useState<CheckoutError | null>(null);
  const [whatsappManualUrl, setWhatsappManualUrl] = useState<string | null>(null);
  const finalizacaoEmAndamento = useRef(false);

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
  
  const handleRemoverItem = async (id: number) => {
    try {
      await removerItemCarrinho(id);
      await refreshCart();
    } catch (err) {
      console.error("Erro ao remover item", err);
    }
  };

  const handleFinalizarReserva = async () => {
    if (finalizacaoEmAndamento.current) return;

    setCheckoutError(null);
    setWhatsappManualUrl(null);

    if (!isAuthenticated) {
      router.push("/login?redirect=/");
      return;
    }

    if (!cep || !numero || !nome || !telefone) {
      setExpandirDados(true);
      setCheckoutError({
        message: "Preencha todos os campos obrigatórios em Dados de Entrega e Contato.",
      });
      return;
    }

    if (!contratoAceito) {
      setCheckoutError({
        message: "Para continuar, é necessário aceitar o contrato de locação.",
      });
      return;
    }

    if (!contratoVigente) {
      setCheckoutError({
        message: "Não foi possível obter a versão atual do contrato. Atualize a página e tente novamente.",
        canRetry: true,
      });
      return;
    }

    finalizacaoEmAndamento.current = true;
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
      const whatsappUrl = getWhatsAppUrl(pedido.whatsapp_resumo);
      setWhatsappManualUrl(whatsappUrl);

      try {
        window.location.assign(whatsappUrl);
      } catch {
        setCheckoutError({
          message: "Seu pedido foi criado, mas o WhatsApp não abriu automaticamente. Use o link abaixo para continuar.",
        });
      }
    } catch (err: unknown) {
      console.error("Erro ao converter pedido:", err);
      setCheckoutError(getCheckoutApiError(err));
    } finally {
      finalizacaoEmAndamento.current = false;
      setLoadingPedido(false);
    }
  };

  if (cartLoading) {
    return (
      <aside className={variant === "drawer"
        ? "fixed bottom-3 right-3 top-20 z-[60] w-[min(calc(100vw-24px),420px)] animate-pulse rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl"
        : "w-full animate-pulse self-start rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-[104px] lg:max-h-[calc(100dvh-120px)] lg:overflow-y-auto"}
      >
        <div className="h-6 bg-zinc-100 rounded w-1/2 mb-8"></div>
        <div className="space-y-4"><div className="h-20 bg-zinc-50 rounded"></div></div>
      </aside>
    );
  }

  return (
    <>
      <aside
        id="reserva"
        className={`custom-scrollbar flex flex-col gap-4 overflow-y-auto bg-white p-4 sm:gap-6 sm:p-5 ${
          variant === "drawer"
            ? "fixed bottom-3 right-3 top-20 z-[60] w-[min(calc(100vw-24px),420px)] rounded-xl border border-zinc-200 shadow-2xl"
            : "w-full self-start rounded-xl border border-zinc-200 shadow-sm lg:sticky lg:top-[104px] lg:max-h-[calc(100dvh-120px)]"
        }`}
      >
        
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <h2 className="text-base font-bold text-zinc-900 sm:text-lg">Seu carrinho ({quantidadeTotal})</h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Fechar resumo do carrinho"
            className="inline-flex min-h-10 items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span aria-hidden="true">×</span>
            Fechar
          </button>
        </div>

        <div className="custom-scrollbar flex max-h-[38dvh] min-h-0 shrink-0 flex-col gap-3 overflow-y-auto pr-1 sm:max-h-[280px] sm:gap-4 sm:pr-2">
          {itens.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">Seu carrinho está vazio.</p>
          ) : (
            itens.map((item) => {
              const imagemUrl = resolveMediaUrl(item.imagem_url);

              return (
              <div key={item.id} className="relative flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white sm:h-24 sm:w-24">
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
                  className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-500 sm:right-2 sm:top-2 sm:h-auto sm:w-auto sm:p-1"
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
            className="group flex min-h-11 w-full items-center justify-between text-left"
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
                <Input placeholder="Nome Completo *" value={nome} onChange={(e) => setNome(e.target.value)} className="col-span-2 min-h-11 py-2 text-sm" />
                <Input placeholder="E-mail *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-2 min-h-11 py-2 text-sm" />
                <Input placeholder="Telefone *" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="col-span-2 min-h-11 py-2 text-sm" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 min-[430px]:grid-cols-3">
                <div className="col-span-1">
                  <Input placeholder="CEP *" value={cep} onChange={(e) => setCep(e.target.value)} maxLength={9} className="min-h-11 py-2 text-sm" />
                </div>
                <div className="col-span-1">
                  <Input placeholder="Número *" value={numero} onChange={(e) => setNumero(e.target.value)} className="min-h-11 py-2 text-sm" />
                </div>
                <div className="col-span-2 min-[430px]:col-span-1">
                  <Input placeholder="Comp." value={complemento} onChange={(e) => setComplemento(e.target.value)} className="min-h-11 py-2 text-sm" />
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
            <span>Taxa de entrega e retirada</span>
            <span>A confirmar pelo endereço</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-base font-bold text-zinc-900">Subtotal dos itens</span>
            <span className="text-lg font-black text-teal-600">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            O total final será confirmado pela BabyPlays após a análise do endereço.
          </p>
        </div>

        <div className="flex flex-col gap-4 mt-2">
          {checkoutError && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
            >
              <p className="leading-5">{checkoutError.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {checkoutError.canRetry && (
                  <button
                    type="button"
                    onClick={handleFinalizarReserva}
                    disabled={loadingPedido}
                    className="min-h-10 rounded-lg border border-amber-300 bg-white px-3 font-bold text-amber-950 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Tentar novamente
                  </button>
                )}
                <a
                  href={whatsappManualUrl || getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center rounded-lg bg-teal-600 px-3 font-bold text-white transition-colors hover:bg-teal-700"
                >
                  {whatsappManualUrl ? "Abrir WhatsApp" : "Falar com a BabyPlays"}
                </a>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={contratoAceito} 
                onChange={(e) => setContratoAceito(e.target.checked)}
                className="h-5 w-5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-bold text-zinc-800">Contrato aceito</span>
            </label>
            <button 
              type="button" 
              onClick={() => setModalContratoAberto(true)} 
              className="min-h-10 shrink-0 rounded-lg px-2 text-xs font-bold text-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:underline"
            >
              Ver contrato
            </button>
          </div>

          <button 
            onClick={handleFinalizarReserva}
            disabled={itens.length === 0 || loadingPedido}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AB2E97] font-bold text-white shadow-sm shadow-[#AB2E97]/20 transition-colors hover:bg-[#872476] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F07F40] disabled:cursor-not-allowed disabled:opacity-50"
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
