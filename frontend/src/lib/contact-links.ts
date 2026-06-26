const HELP_WHATSAPP_MESSAGE =
  "Olá! Gostaria de ajuda para escolher brinquedos ou kits para locação.";
const DEFAULT_WHATSAPP_NUMBER = "5551981177297";
const DEFAULT_INSTAGRAM_URL =
  "https://www.instagram.com/babyplays.brinquedos/";

export function getInstagramUrl() {
  const value = process.env.NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL?.trim();
  return value || DEFAULT_INSTAGRAM_URL;
}

export function getWhatsAppUrl(message = HELP_WHATSAPP_MESSAGE) {
  const configuredNumber =
    process.env.NEXT_PUBLIC_BABYPLAYS_WHATSAPP?.replace(/\D/g, "");
  const number = configuredNumber || DEFAULT_WHATSAPP_NUMBER;

  return `https://api.whatsapp.com/send/?phone=${number}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
}
