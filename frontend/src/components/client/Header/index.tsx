"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { getAdminMe } from "@/services/auth";
import { removerItemCarrinho } from "@/services/cart";

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconCart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

type HeaderProps = {
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
};

export function Header({ searchQuery, onSearchQueryChange }: HeaderProps) {
  const router = useRouter();
  const cartRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificandoAdmin, setVerificandoAdmin] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  
  const { cliente, user, isAuthenticated, logout } = useAuth();
  const {
    carrinho,
    cartLoading,
    closeCart,
    isCartOpen,
    refreshCart,
    toggleCart,
  } = useCart();
  const currentSearchQuery = searchQuery ?? localSearchQuery;
  const accountLabel = cliente?.nome ?? user?.email ?? "cliente";

  // Fechar o carrinho ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        closeCart();
      }

      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeCart]);

  useEffect(() => {
    let active = true;

    async function verificarAdmin() {
      if (!isAuthenticated) {
        setIsAdmin(false);
        setVerificandoAdmin(false);
        return;
      }

      setVerificandoAdmin(true);

      try {
        const data = await getAdminMe();

        if (active) {
          setIsAdmin(data.is_staff || data.is_superuser);
        }
      } catch {
        if (active) {
          setIsAdmin(false);
        }
      } finally {
        if (active) {
          setVerificandoAdmin(false);
        }
      }
    }

    void verificarAdmin();

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleSearchQueryChange = (value: string) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(value);
      return;
    }
    setLocalSearchQuery(value);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setLogoutError(null);
    try {
      await logout();
      setIsAccountMenuOpen(false);
    } catch {
      setLogoutError("Nao foi possivel sair. Atualize a pagina e tente novamente.");
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleRemoverItem = async (itemId: number) => {
    setRemovendoId(itemId);
    try {
      await removerItemCarrinho(itemId);
      await refreshCart();
    } catch {
      alert("Erro ao remover item do carrinho.");
    } finally {
      setRemovendoId(null);
    }
  };

  const quantidadeCarrinho = carrinho?.itens.reduce((acc, item) => acc + item.quantidade, 0) || 0;
  const valorTotal = carrinho?.itens.reduce((acc, item) => acc + parseFloat(item.subtotal_snapshot), 0) || 0;

  return (
    <header className="w-full bg-white border-b border-zinc-100 sticky top-0 z-40">
      <div className="max-w-1600px mx-auto px-6 h-20 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 cursor-pointer select-none shrink-0">
          <span className="relative block h-14 w-16 shrink-0 overflow-hidden">
            <Image
              src="/assets/SomenteLogo.jpg"
              alt="Logo BabyPlays"
              width={128}
              height={102}
              priority
              unoptimized
              sizes="64px"
              className="absolute left-1/2 top-1/2 h-[92px] w-[115px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
            />
          </span>
          <div className="text-xl font-black tracking-tight flex items-center">
            <span className="text-teal-600">BABYPLAYS</span>
            <span className="text-zinc-300 mx-0.5">.</span>
            <span className="text-[#FF5A5F]">BRINQUEDOS</span>
          </div>
        </Link>

        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-xl relative flex items-center"
        >
          <input
            type="text"
            placeholder="Buscar brinquedos"
            value={currentSearchQuery}
            onChange={(e) => handleSearchQueryChange(e.target.value)}
            className="w-full h-11 pl-5 pr-12 bg-[#F8F9FA] border border-zinc-200 rounded-full text-sm text-zinc-900 outline-none transition-all focus:bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600 placeholder:text-zinc-400"
          />
          <button
            type="submit"
            aria-label="Pesquisar"
            className="absolute right-4 text-zinc-400 hover:text-teal-600 transition-colors cursor-pointer"
          >
            <IconSearch />
          </button>
        </form>

        <div className="flex items-center gap-6 shrink-0">
          {isAuthenticated ? (
            <div className="relative select-none" ref={accountRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((open) => !open)}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-3 rounded-full transition-colors hover:text-teal-600"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-zinc-500 font-medium leading-tight">
                    Olá, {accountLabel}
                  </p>
                  <p className="text-xs text-zinc-800 font-bold leading-tight">
                    Minha conta
                  </p>
                </div>
                <span className="p-2 text-zinc-700 bg-zinc-50 rounded-full transition-colors">
                  <IconUser />
                </span>
              </button>

              {isAccountMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-4 w-64 overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-xl z-50 before:content-[''] before:absolute before:-top-2 before:right-4 before:w-4 before:h-4 before:bg-white before:rotate-45 before:border-l before:border-t before:border-zinc-100"
                >
                  <div className="relative z-10 border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
                    <p className="text-xs font-medium text-zinc-500">Conta</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-zinc-900">
                      {accountLabel}
                    </p>
                  </div>

                  <div className="relative z-10 flex flex-col bg-white py-2">
                    <Link
                      href="/minha-conta"
                      role="menuitem"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-teal-50 hover:text-teal-700"
                    >
                      Minha conta
                    </Link>

                    {isAdmin && !verificandoAdmin ? (
                      <Link
                        href="/admin/brinquedos"
                        role="menuitem"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-teal-50 hover:text-teal-700"
                      >
                        Painel administrativo
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      disabled={logoutLoading}
                      className="px-4 py-2.5 text-left text-sm font-semibold text-zinc-800 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {logoutLoading ? "Saindo..." : "Sair"}
                    </button>

                    {logoutError ? (
                      <p className="px-4 pb-2 pt-1 text-xs font-medium leading-tight text-red-600">
                        {logoutError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 select-none">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-zinc-500 font-medium leading-tight">Bem-vindo</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Link
                    href="/login"
                    className="text-xs text-zinc-800 font-bold leading-tight hover:text-teal-600 transition-colors"
                  >
                    Entrar
                  </Link>
                  <span className="text-xs text-zinc-300">ou</span>
                  <Link
                    href="/register"
                    className="text-xs text-teal-600 font-bold leading-tight hover:text-teal-700 transition-colors"
                  >
                    Cadastrar
                  </Link>
                </div>
              </div>
              <Link 
                href="/login" 
                className="p-2 text-zinc-700 hover:text-teal-600 bg-zinc-50 hover:bg-teal-50 rounded-full transition-colors cursor-pointer"
              >
                <IconUser />
              </Link>
            </div>
          )}

          <div className="h-6 w-px bg-zinc-200 hidden sm:block"></div>

          {/* ÁREA DO CARRINHO COM DROPDOWN */}
          <div className="relative" ref={cartRef}>
            <button
              type="button"
              onClick={() => void toggleCart()}
              aria-label="Ver carrinho de compras"
              className="relative p-2 text-zinc-700 hover:text-teal-600 bg-zinc-50 rounded-full transition-colors cursor-pointer group"
            >
              <IconCart />
              {quantidadeCarrinho > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF5A5F] text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm group-hover:scale-110 transition-transform">
                  {quantidadeCarrinho}
                </span>
              )}
            </button>

            {/* O Dropdown do Carrinho */}
            {isCartOpen && (
              <div className="absolute right-0 top-full mt-4 w-80 md:w-96 bg-white border border-zinc-100 rounded-2xl shadow-xl flex flex-col z-50 overflow-hidden before:content-[''] before:absolute before:-top-2 before:right-4 before:w-4 before:h-4 before:bg-white before:rotate-45 before:border-l before:border-t before:border-zinc-100">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between z-10 relative">
                  <h3 className="font-bold text-zinc-900">O seu carrinho</h3>
                  <span className="text-xs font-medium text-zinc-500">{quantidadeCarrinho} item(s)</span>
                </div>

                <div className="p-4 max-h-[300px] overflow-y-auto flex flex-col gap-4 z-10 relative bg-white">
                  {cartLoading ? (
                    <p className="text-center text-sm text-zinc-400 py-4 animate-pulse">A carregar...</p>
                  ) : quantidadeCarrinho === 0 ? (
                    <div className="text-center py-6 flex flex-col items-center">
                      <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3 text-zinc-300">
                        <IconCart />
                      </div>
                      <p className="text-sm text-zinc-500">O carrinho está vazio.</p>
                    </div>
                  ) : (
                    carrinho?.itens.map((item) => (
                      <div key={item.id} className="flex gap-3 group">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-zinc-800 line-clamp-1">{item.nome_snapshot}</h4>
                          {item.snapshot.periodo_locacao ? (
                            <p className="mt-0.5 text-xs font-medium text-zinc-500">
                              Periodo: {item.snapshot.periodo_locacao.label}
                            </p>
                          ) : null}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold text-teal-600">R$ {item.subtotal_snapshot}</span>
                            <span className="text-xs text-zinc-400">Qtd: {item.quantidade}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoverItem(item.id)}
                          disabled={removendoId === item.id}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Remover item"
                        >
                          {removendoId === item.id ? (
                            <span className="block w-4 h-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                          ) : (
                            <IconTrash />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {quantidadeCarrinho > 0 && (
                  <div className="p-4 border-t border-zinc-100 bg-zinc-50 z-10 relative">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-zinc-600 font-medium">Total:</span>
                      <span className="text-lg font-black text-teal-600">R$ {valorTotal.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => {
                        closeCart();
                        router.push("/checkout");
                      }}
                      className="w-full py-3 bg-[#FF5A5F] hover:bg-[#ff444a] text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-red-500/20"
                    >
                      Finalizar Pedido
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
