"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { getAdminMe } from "@/services/auth";
import { SidebarCart } from "@/components/client/SidebarCart";

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

type HeaderProps = {
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  cartDropdownEnabled?: boolean;
};

export function Header({
  searchQuery,
  onSearchQueryChange,
  cartDropdownEnabled = true,
}: HeaderProps) {
  const accountRef = useRef<HTMLDivElement>(null);

  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificandoAdmin, setVerificandoAdmin] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  
  const { cliente, user, isAuthenticated, logout } = useAuth();
  const {
    carrinho,
    closeCart,
    isCartOpen,
    openCart,
    toggleCart,
  } = useCart();
  const currentSearchQuery = searchQuery ?? localSearchQuery;
  const accountLabel = cliente?.nome ?? user?.email ?? "cliente";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!cartDropdownEnabled || !isCartOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [cartDropdownEnabled, isCartOpen]);

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

  const handleCartClick = async () => {
    if (cartDropdownEnabled) {
      await toggleCart();
      return;
    }

    openCart();
    window.setTimeout(() => {
      document.getElementById("reserva")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const quantidadeCarrinho = carrinho?.itens.reduce((acc, item) => acc + item.quantidade, 0) || 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-100 bg-white">
      <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-2 sm:min-h-20 sm:px-6 sm:py-3 lg:flex-nowrap lg:gap-4">
        <Link href="/" className="flex min-w-0 shrink cursor-pointer select-none items-center gap-1 sm:shrink-0 sm:gap-2">
          <span className="relative block h-10 w-10 shrink-0 overflow-hidden sm:h-14 sm:w-16">
            <Image
              src="/assets/SomenteLogo.jpg"
              alt=""
              width={128}
              height={102}
              priority
              unoptimized
              sizes="(max-width: 639px) 40px, 64px"
              className="absolute left-1/2 top-1/2 h-[64px] w-[80px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain sm:h-[92px] sm:w-[115px]"
            />
          </span>
          <span className="relative block h-10 w-[150px] shrink overflow-hidden min-[430px]:w-44 sm:h-[72px] sm:w-76 sm:shrink-0 lg:overflow-visible">
            <Image
              src="/logo-babyplays-header.png"
              alt="BabyPlays - Locação de brinquedos"
              width={2048}
              height={683}
              priority
              sizes="(max-width: 429px) 150px, (max-width: 639px) 176px, (max-width: 1023px) 280px, 352px"
              className="absolute left-1/2 top-1/2 h-auto w-[142px] max-h-28 -translate-x-1/2 -translate-y-1/2 object-contain min-[430px]:w-40 sm:w-[280px] sm:max-h-[180px] lg:left-0 lg:w-[352px] lg:translate-x-0"
            />
          </span>
        </Link>

        <form
          onSubmit={handleSearch}
          className="relative order-3 flex w-full flex-none items-center lg:order-none lg:max-w-xl lg:flex-1"
        >
          <input
            type="text"
            placeholder="Buscar brinquedos e kits"
            value={currentSearchQuery}
            onChange={(e) => handleSearchQueryChange(e.target.value)}
            className="h-10 w-full rounded-full border border-zinc-200 bg-[#F8F9FA] pl-4 pr-11 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600 sm:h-11 sm:pl-5 sm:pr-12"
          />
          <button
            type="submit"
            aria-label="Pesquisar"
            className="absolute right-4 text-zinc-400 hover:text-teal-600 transition-colors cursor-pointer"
          >
            <IconSearch />
          </button>
        </form>

        <div className="flex shrink-0 items-center gap-2 sm:gap-6">
          {isAuthenticated ? (
            <div className="relative select-none" ref={accountRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((open) => !open)}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                className="flex min-h-10 items-center gap-3 rounded-full transition-colors hover:text-teal-600"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-zinc-500 font-medium leading-tight">
                    Olá, {accountLabel}
                  </p>
                  <p className="text-xs text-zinc-800 font-bold leading-tight">
                    Minha conta
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 text-zinc-700 transition-colors">
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
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 text-zinc-700 transition-colors hover:bg-teal-50 hover:text-teal-600"
              >
                <IconUser />
              </Link>
            </div>
          )}

          <div className="h-6 w-px bg-zinc-200 hidden sm:block"></div>

          {/* ÁREA DO CARRINHO */}
          <div className="relative">
            <button
              type="button"
              onClick={() => void handleCartClick()}
              aria-label="Ver carrinho de compras"
              className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 text-zinc-700 transition-colors hover:text-teal-600"
            >
              <IconCart />
              {quantidadeCarrinho > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF5A5F] text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm group-hover:scale-110 transition-transform">
                  {quantidadeCarrinho}
                </span>
              )}
            </button>

            {cartDropdownEnabled && isCartOpen && (
              <>
                <button
                  type="button"
                  aria-label="Fechar carrinho"
                  onClick={closeCart}
                  className="fixed inset-0 z-50 cursor-default bg-[#2C1615]/25 backdrop-blur-[1px]"
                />
                <SidebarCart variant="drawer" />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
