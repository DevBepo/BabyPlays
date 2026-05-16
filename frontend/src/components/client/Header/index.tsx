"use client";

import { useState } from "react";

// Ícone do Cavalinho de Balanço (Logótipo) temos que mudar depois para a logo da babyplays...
const IconRockingHorse = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
    <path d="M3 19a3 3 0 0 0 6 0" />
    <path d="M15 19a3 3 0 0 0 6 0" />
    <path d="M12 5v14" />
    <path d="m19 9-7 3-7-3" />
    <path d="M9 14h6" />
  </svg>
);

// Ícone de Lupa (Pesquisa)
const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

// Ícone de Utilizador / Perfil
const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Ícone de Carrinho de Compras
const IconCart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </svg>
);

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Pesquisando por:", searchQuery);
    // Aqui ligamos futuramente com a rota de listagem ou filtros do Django
  };

  return (
    <header className="w-full bg-white border-b border-zinc-100 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between gap-4">
        
        {/* 1. LOGÓTIPO */}
        <div className="flex items-center gap-2 cursor-pointer select-none shrink-0">
          <IconRockingHorse />
          <div className="text-xl font-black tracking-tight flex items-center">
            <span className="text-teal-600">BABYPLAYS</span>
            <span className="text-zinc-300 mx-0.5">.</span>
            <span className="text-[#FF5A5F]">BRINQUEDOS</span>
          </div>
        </div>

        {/* 2. BARRA DE PESQUISA */}
        <form 
          onSubmit={handleSearch}
          className="flex-1 max-w-xl relative flex items-center"
        >
          <input
            type="text"
            placeholder="Buscar brinquedos"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* 3. ÁREA DO UTILIZADOR E CARRINHO */}
        <div className="flex items-center gap-6 shrink-0">
          
          {/* Bloco de Conta */}
          <div className="flex items-center gap-2 cursor-pointer group select-none">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-zinc-500 font-medium leading-tight">Olá, Camila</p>
              <p className="text-xs text-zinc-800 font-bold leading-tight group-hover:text-teal-600 transition-colors">Minha conta</p>
            </div>
            <div className="p-2 text-zinc-700 group-hover:text-teal-600 bg-zinc-50 rounded-full transition-colors">
              <IconUser />
            </div>
          </div>

          {/* Separador*/}
          <div className="h-6 w-px bg-zinc-200 hidden sm:block"></div>

          {/* Botão do Carrinho */}
          <button
            type="button"
            aria-label="Ver carrinho de compras"
            className="relative p-2 text-zinc-700 hover:text-teal-600 bg-zinc-50 rounded-full transition-colors cursor-pointer group"
          >
            <IconCart />
            
            {/* Badge de quantidade flutuante */}
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF5A5F] text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm group-hover:scale-110 transition-transform">
              3
            </span>
          </button>

        </div>

      </div>
    </header>
  );
}