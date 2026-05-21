import { apiGet } from "@/lib/api";
import type { BrinquedoCatalogo, KitFestaCatalogo } from "@/types/catalogo";

const CATALOGO_ENDPOINTS = {
  brinquedos: "/api/brinquedos/",
  kitsFesta: "/api/kits-festa/",
};

export function listarBrinquedos(): Promise<BrinquedoCatalogo[]> {
  return apiGet<BrinquedoCatalogo[]>(CATALOGO_ENDPOINTS.brinquedos);
}

export function listarKitsFesta(): Promise<KitFestaCatalogo[]> {
  return apiGet<KitFestaCatalogo[]>(CATALOGO_ENDPOINTS.kitsFesta);
}
