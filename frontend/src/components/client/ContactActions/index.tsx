import { getInstagramUrl, getWhatsAppUrl } from "@/lib/contact-links";

const IconInstagram = () => (
  <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="20" height="20" x="2" y="2" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </svg>
);

const IconMessage = () => (
  <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>
);

export function ContactActions({
  compact = false,
  showInstagram = true,
}: {
  compact?: boolean;
  showInstagram?: boolean;
}) {
  const instagramUrl = getInstagramUrl();
  const whatsappUrl = getWhatsAppUrl();
  const baseClass = `inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors ${
    compact ? "px-4 py-2.5 text-sm" : "px-5 py-3 text-sm"
  }`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {showInstagram && instagramUrl ? (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClass} bg-pink-500 text-white hover:bg-pink-600`}
        >
          <IconInstagram />
          Ver ideias no Instagram
        </a>
      ) : showInstagram ? (
        <span className={`${baseClass} cursor-not-allowed bg-zinc-100 text-zinc-400`}>
          <IconInstagram />
          Instagram não configurado
        </span>
      ) : null}

      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClass} bg-emerald-500 text-white hover:bg-emerald-600`}
        >
          <IconMessage />
          Falar com a BabyPlays
        </a>
      ) : (
        <span className={`${baseClass} cursor-not-allowed bg-zinc-100 text-zinc-400`}>
          <IconMessage />
          WhatsApp não configurado
        </span>
      )}
    </div>
  );
}
