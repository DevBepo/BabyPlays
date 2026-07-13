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

const IconHelp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

const IconMapPin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 4.99-5.54 10.16-7.4 11.75a1 1 0 0 1-1.2 0C9.54 20.16 4 14.99 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconSpark = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
  </svg>
);

export function SubNavbar() {
  // 2. Array de itens para facilitar a manutenção e não repetir código
  const navItems = [
    { label: "Brinquedos", icon: <IconStar />, href: "/#brinquedos" },
    { label: "Kits Festas", icon: <IconGift />, href: "/#kits-festa" },
    { label: "Como funciona", icon: <IconClock />, href: "/como-funciona" },
    { label: "Onde atendemos", icon: <IconMapPin />, href: "/como-funciona#onde-atendemos" },
    { label: "Por que alugar", icon: <IconSpark />, href: "/como-funciona#por-que-alugar" },
    { label: "Ajuda", icon: <IconHelp />, href: "/ajuda" },
  ];

  return (
    <nav className="w-full border-b border-zinc-200 bg-white">
      {/* Container com scroll horizontal em telas menores (overflow-x-auto) */}
      <div className="mx-auto flex h-12 max-w-[1600px] items-center overflow-x-auto overscroll-x-contain scroll-smooth scroll-px-3 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6">
        <ul className="flex min-w-max items-center gap-3 whitespace-nowrap pr-4 sm:gap-6 sm:pr-0 lg:gap-7">
          {navItems.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className="group flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full bg-[#FFF9F7] px-3.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-[#F7EAF5] hover:text-[#AB2E97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#AB2E97] sm:min-h-0 sm:bg-transparent sm:px-0 sm:hover:bg-transparent [font-family:var(--font-fredoka)]"
              >
                {/* O ícone fica mais claro por padrão, e escurece no hover junto com o texto */}
                <span className="text-zinc-400 transition-colors group-hover:text-[#AB2E97]">
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
