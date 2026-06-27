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
  useBrandPalette = false,
  showInstagram = true,
  showWhatsApp = true,
  instagramLabel = "Ver ideias no Instagram",
  whatsappLabel = "Falar com a BabyPlays",
  whatsappMessage,
}: {
  compact?: boolean;
  useBrandPalette?: boolean;
  showInstagram?: boolean;
  showWhatsApp?: boolean;
  instagramLabel?: string;
  whatsappLabel?: string;
  whatsappMessage?: string;
}) {
  const instagramUrl = getInstagramUrl();
  const whatsappUrl = getWhatsAppUrl(whatsappMessage);
  const baseClass = `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl font-bold transition-colors sm:w-auto ${
    compact ? "px-4 py-2.5 text-sm" : "px-5 py-3 text-sm"
  }`;
  const hasInstagram = showInstagram && Boolean(instagramUrl);
  const hasWhatsApp = showWhatsApp && Boolean(whatsappUrl);

  if (!hasInstagram && !hasWhatsApp) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {hasInstagram && instagramUrl ? (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClass} ${
            useBrandPalette
              ? "bg-[#AB2E97] text-white hover:bg-[#803233]"
              : "bg-pink-500 text-white hover:bg-pink-600"
          }`}
        >
          <IconInstagram />
          {instagramLabel}
        </a>
      ) : null}

      {hasWhatsApp && whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClass} ${
            useBrandPalette
              ? "bg-[#76CFC8] text-[#2C1615] hover:bg-[#FAB555]"
              : "bg-emerald-500 text-white hover:bg-emerald-600"
          }`}
        >
          <IconMessage />
          {whatsappLabel}
        </a>
      ) : null}
    </div>
  );
}
