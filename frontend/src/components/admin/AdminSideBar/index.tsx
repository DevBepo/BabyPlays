"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


const IconDashboard = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="10" rx="1" />
    <rect width="7" height="5" x="3" y="14" rx="1" />
  </svg>
);

const IconAgenda = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const IconToy = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
    <path d="M18 8h4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-4" />
  </svg>
);

const IconCategory = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.886H3.894l4.948 3.596L6.93 18.368 12 14.772l5.07 3.596-1.912-5.886 4.948-3.596h-6.194Z" />
  </svg>
);

const IconKits = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);

const IconOrders = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconDelivery = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="16" height="11" x="2" y="6" rx="2" />
    <path d="M16 17h2l4-4V6h-6v11Z" />
    <circle cx="7.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const menuItems = [
  { label: "Visão Geral", icon: <IconDashboard />, href: "/admin" },
  { label: "Agenda", icon: <IconAgenda />, href: "/admin/agenda" },
  { label: "Brinquedos", icon: <IconToy />, href: "/admin/brinquedos" },
  { label: "Categorias", icon: <IconCategory />, href: "/admin/categorias" },
  { label: "Kits Festa", icon: <IconKits />, href: "/admin/kits" },
  { label: "Pedidos", icon: <IconOrders />, href: "/admin/pedidos" },
  { label: "Avise-me", icon: <IconOrders />, href: "/admin/interesses" },
  { label: "Contrato", icon: <IconOrders />, href: "/admin/contrato" },
  { label: "Entregas", icon: <IconDelivery />, href: "/admin/entregas" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex h-screen w-64 flex-col border-r border-zinc-200 bg-white text-zinc-600">
      <div className="flex h-20 shrink-0 flex-col justify-center border-b border-zinc-100 px-6">
        <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-teal-600">
          Ambiente de Gestão
        </span> 
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200
                    ${
                      isActive
                        ? "bg-teal-50 text-teal-700 font-bold"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }
                  `}
                >
                  <span
                    className={isActive ? "text-teal-600" : "text-zinc-400"}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Rodapé da Sidebar */}
      <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 p-4 text-xs text-zinc-500">
        <span>Admin v1.0</span>
        <Link href="/" className="font-medium text-teal-600 hover:underline">
          Ver Loja
        </Link>
      </div>
    </aside>
  );
}
