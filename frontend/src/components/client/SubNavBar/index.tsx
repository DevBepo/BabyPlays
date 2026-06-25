import Link from "next/link";

const IconStar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconGift = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect width="20" height="5" x="2" y="7" />
    <line x1="12" x2="12" y1="22" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconHelp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

export function SubNavbar() {
  // 2. Array de itens para facilitar a manutenção e não repetir código
  const navItems = [
    { label: "Brinquedos", icon: <IconStar />, href: "#brinquedos" },
    { label: "Kits Festas", icon: <IconGift />, href: "#kits-festa" },
    { label: "Como funciona", icon: <IconClock />, href: "#como-funciona" },
    { label: "Planos", icon: <IconCheck />, href: "#planos" },
    { label: "Ajuda", icon: <IconHelp />, href: "#ajuda" },
  ];

  return (
    <nav className="w-full bg-white border-b border-zinc-200">
      {/* Container com scroll horizontal em telas menores (overflow-x-auto) */}
      <div className="mx-auto flex h-12 max-w-[1600px] items-center overflow-x-auto px-4 sm:px-6 scrollbar-hide">
        <ul className="flex min-w-max items-center gap-8 whitespace-nowrap">
          {navItems.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className="group flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                {/* O ícone fica mais claro por padrão, e escurece no hover junto com o texto */}
                <span className="text-zinc-400 group-hover:text-zinc-900 transition-colors">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
