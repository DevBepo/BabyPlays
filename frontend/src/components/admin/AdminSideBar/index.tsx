"use client";

import Link from "next/link";
import Image from "next/image";
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

const IconExternalLink = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
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

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({
  open,
  onClose,
  isCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      id="admin-navigation"
      className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-[min(20rem,88vw)] flex-col border-r border-zinc-200 bg-white text-zinc-600 shadow-xl transition-all duration-200 ease-out lg:z-30 lg:translate-x-0 lg:shadow-none ${
        isCollapsed ? "lg:w-20" : "lg:w-64"
      } ${
        open ? "visible translate-x-0" : "invisible -translate-x-full lg:visible"
      }`}
    >
      <div
        className={`flex h-20 shrink-0 items-center border-b border-zinc-100 transition-all ${
          isCollapsed ? "justify-center px-0" : "justify-between px-5 lg:px-6"
        }`}
      >
        <div
          className={`flex min-w-0 items-center gap-2 ${
            isCollapsed ? "hidden lg:hidden" : ""
          }`}
        >
          <span className="relative h-14 w-10 shrink-0 overflow-hidden lg:hidden">
            <Image
              src="/assets/LogoComEscrita.jpg"
              alt="BabyPlays - Locação de brinquedos"
              width={1275}
              height={990}
              sizes="40px"
              className="absolute left-1/2 top-1/2 h-16 w-auto max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
            />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">
            Ambiente de Gestão
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className={`hidden h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-600 lg:flex ${
            isCollapsed ? "" : "-mr-2"
          }`}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? (
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
              <path d="m9 18 6-6-6-6" />
            </svg>
          ) : (
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
              <path d="m15 18-6-6 6-6" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 lg:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
          Fechar
        </button>
      </div>

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
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex min-h-11 items-center rounded-lg py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    isCollapsed ? "justify-center px-0" : "gap-3 px-4"
                  } ${
                    isActive
                      ? "bg-teal-50 font-bold text-teal-700"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <span
                    className={`shrink-0 ${
                      isActive ? "text-teal-600" : "text-zinc-400"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={`flex items-center border-t border-zinc-100 bg-zinc-50 p-4 text-xs text-zinc-500 transition-all ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!isCollapsed && <span>Admin v1.0</span>}
        <Link
          href="/"
          onClick={onClose}
          title={isCollapsed ? "Ver Loja" : undefined}
          className={`flex items-center justify-center rounded text-teal-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
            isCollapsed ? "h-8 w-8 hover:bg-teal-50" : "font-medium"
          }`}
        >
          {isCollapsed ? <IconExternalLink /> : "Ver Loja"}
        </Link>
      </div>
    </aside>
  );
}