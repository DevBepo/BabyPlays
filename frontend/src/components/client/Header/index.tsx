"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { obterCarrinhoAtual } from "@/services/cart";

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
};

export function Header({ searchQuery, onSearchQueryChange }: HeaderProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [quantidadeCarrinho, setQuantidadeCarrinho] = useState(0);
  
  const { cliente, user, isAuthenticated, logout } = useAuth();
  const currentSearchQuery = searchQuery ?? localSearchQuery;
  const accountLabel = cliente?.nome ?? user?.email ?? "cliente";

  useEffect(() => {
    async function carregarQuantidadeCarrinho() {
      try {
        const carrinho = await obterCarrinhoAtual();
        const total = carrinho.itens.reduce((acc, item) => acc + item.quantidade, 0);
        setQuantidadeCarrinho(total);
      } catch (error) {
        console.error("Erro ao procurar o carrinho:", error);
      }
    }
    carregarQuantidadeCarrinho();
  }, []);

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
    } catch {
      setLogoutError("Nao foi possivel sair. Atualize a pagina e tente novamente.");
    } finally {
      setLogoutLoading(false);
    }
  };

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
            <div className="flex items-center gap-3 select-none">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-zinc-500 font-medium leading-tight">
                  Olá, {accountLabel}
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="text-xs text-zinc-800 font-bold leading-tight hover:text-teal-600 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {logoutLoading ? "Saindo..." : "Sair"}
                </button>
                {logoutError ? (
                  <p className="mt-1 max-w-48 text-xs font-medium leading-tight text-red-600">
                    {logoutError}
                  </p>
                ) : null}
              </div>
              <div className="p-2 text-zinc-700 bg-zinc-50 rounded-full transition-colors">
                <IconUser />
              </div>
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

          <button
            type="button"
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
        </div>
      </div>
    </header>
  );
}
