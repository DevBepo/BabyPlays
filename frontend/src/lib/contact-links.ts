const HELP_WHATSAPP_MESSAGE =
  "Olá! Gostaria de ajuda para escolher brinquedos ou kits para locação.";

export function getInstagramUrl() {
  const value = process.env.NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL?.trim();
  return value || null;
}

export function getWhatsAppUrl(message = HELP_WHATSAPP_MESSAGE) {
  const number = process.env.NEXT_PUBLIC_BABYPLAYS_WHATSAPP?.replace(/\D/g, "");
  if (!number) return null;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
