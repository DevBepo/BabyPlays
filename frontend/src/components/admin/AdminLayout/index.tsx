import { ReactNode } from "react";
import { AdminSidebar } from "../AdminSideBar";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans antialiased">
      {/* 1. Menu Lateral Fixo */}
      <AdminSidebar />

      {/* 2. Área de Conteúdo Principal à direita da Sidebar (pl-64 compensa a largura fixa) */}
      <div className="pl-64 flex flex-col min-h-screen">
        
        {/* Barra Superior Administrativa (Topbar) */}
        <header className="h-20 bg-white border-b border-zinc-200 px-8 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Ambiente de Gestão
            </h1>
          </div>
          
          {/* Informações do utilizador administrativo ligado ao sistema */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-zinc-800">Modo Administrador</span>
              <span className="text-xs text-zinc-400 font-medium">admin@babyplays.com</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm select-none">
              ADM
            </div>
          </div>
        </header>

        {/* 3. Espaço de renderização das páginas dinâmicas do painel */}
        <main className="flex-1 p-8 max-w-[1600px] w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}