"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const exploreLinks = [
  { label: "Brinquedos", href: "/#brinquedos" },
  { label: "Kits Festas", href: "/#kits-festa" },
  { label: "Como funciona", href: "/como-funciona" },
];

const informationLinks = [
  { label: "Onde atendemos", href: "/como-funciona#onde-atendemos" },
  { label: "Por que alugar", href: "/como-funciona#por-que-alugar" },
  { label: "Ajuda", href: "/ajuda" },
];

const linkClass =
  "inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-[#2C1615]/75 transition-colors hover:bg-white/70 hover:text-[#AB2E97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AB2E97]";

const IconInstagram = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const IconWhatsapp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export function Footer() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { openCart } = useCart();
  const whatsappUrl = "https://wa.me/5551981177297?text=Ol%C3%A1%2C%20quero%20conhecer%20mais%20dos%20produtos%20da%20Baby%20Plays!";
  const instagramUrl = "https://www.instagram.com/babyplays.brinquedos?igsh=OGY4NmY3Znp6bnAx";

  const handleCartShortcut = () => {
    openCart();

    if (pathname === "/") {
      window.setTimeout(() => {
        document.getElementById("reserva")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 0);
    }
  };

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-[#AB2E97]/15 bg-gradient-to-br from-[#FFF4E3] via-[#FDF5E9] to-[#E8F7F4] text-[#2C1615] shadow-[0_-8px_24px_rgba(44,22,21,0.05)]">
      <div className="relative">
        <span className="pointer-events-none absolute -left-6 top-7 h-12 w-12 rounded-full bg-[#FAB555]/20" aria-hidden="true" />
        <span className="pointer-events-none absolute right-[7%] top-5 h-6 w-6 rotate-12 rounded-lg bg-[#EA524B]/12" aria-hidden="true" />

        <div className="relative mx-auto max-w-[1600px] px-4 pb-4 pt-6 sm:px-6 sm:pb-5 sm:pt-7">
          <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.25fr_.75fr_.9fr_.9fr_1.35fr] lg:items-start lg:gap-6">
          <div>
            <Link href="/" className="inline-flex rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#AB2E97]">
              <span className="relative block h-24 w-[68px] overflow-hidden">
                <Image
                  src="/assets/LogoComEscrita.jpg"
                  alt="BabyPlays - Locação de brinquedos"
                  width={1275}
                  height={990}
                  sizes="146px"
                  className="absolute left-1/2 top-1/2 h-28 w-auto max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
                />
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-5 text-[#2C1615]/65">
              Brinquedos para criar memórias, diversão e momentos especiais em família.
            </p>
          </div>

          <nav aria-label="Navegação do rodapé">
            <h2 className="mb-2 text-base font-bold text-[#AB2E97] [font-family:var(--font-fredoka)]">Explore</h2>
            <ul className="grid gap-0.5">
              {exploreLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Informações">
            <h2 className="mb-2 text-base font-bold text-[#AB2E97] [font-family:var(--font-fredoka)]">Informações</h2>
            <ul className="grid gap-0.5">
              {informationLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-2 text-base font-bold text-[#AB2E97] [font-family:var(--font-fredoka)]">Sua BabyPlays</h2>
            <div className="grid gap-0.5">
              <Link href={isAuthenticated ? "/minha-conta" : "/login"} className={linkClass}>
                {isAuthenticated ? "Minha conta" : "Entrar"}
              </Link>
              {!isAuthenticated ? <Link href="/register" className={linkClass}>Criar conta</Link> : null}
              <button type="button" onClick={handleCartShortcut} className={`${linkClass} w-fit text-left`}>
                Ver carrinho
              </button>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-base font-bold text-[#AB2E97] [font-family:var(--font-fredoka)]">Fale com a gente</h2>
            <p className="mb-3 text-sm leading-5 text-[#2C1615]/65">Tire dúvidas e acompanhe as novidades da BabyPlays.</p>
            <div className="flex flex-wrap gap-2.5">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#76CFC8] px-3.5 text-sm font-bold text-[#173E3A] shadow-sm transition-colors hover:bg-[#5DBDB5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AB2E97]">
                <IconWhatsapp /> WhatsApp
              </a>
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#AB2E97]/25 bg-white/65 px-3.5 text-sm font-bold text-[#AB2E97] transition-colors hover:border-[#AB2E97]/45 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AB2E97]">
                <IconInstagram /> Instagram
              </a>
            </div>
          </div>
          </div>

          <div className="mt-5 border-t border-[#AB2E97]/15 pt-3.5 text-center text-xs font-medium text-[#2C1615]/50 sm:text-left">
            © {new Date().getFullYear()} BabyPlays
          </div>
        </div>
      </div>
    </footer>
  );
}
