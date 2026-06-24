import { getInstagramUrl, getWhatsAppUrl } from "@/lib/contact-links";

export function Footer() {
  const whatsappUrl = getWhatsAppUrl(
    "Olá! Quero conhecer mais sobre os brinquedos e kits da BabyPlays.",
  );
  const instagramUrl = getInstagramUrl();

  return (
    <footer className="mt-auto w-full border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <div className="flex flex-col-reverse items-center justify-between gap-6 md:flex-row">
          
          {/* Direitos Autorais */}
          <p className="text-sm font-medium text-zinc-500">
            © {new Date().getFullYear()} BabyPlays. Todos os direitos reservados.
          </p>

          {/* Links de Contato (Estilo Minimalista) */}
          <div className="flex items-center gap-8">
            {whatsappUrl && <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:text-emerald-600"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              WhatsApp
            </a>}

            {instagramUrl && <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:text-pink-600"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-pink-50 group-hover:text-pink-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </span>
              Instagram
            </a>}
          </div>

        </div>
      </div>
    </footer>
  );
}
