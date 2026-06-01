import { apiGet, apiPost } from "@/lib/api";
import type { AdminKitFesta, CriarKitFestaPayload } from "@/types/adminKits";

const ADMIN_KITS_ENDPOINT = "/api/kits-festa/";

export function listarAdminKitsFesta(): Promise<AdminKitFesta[]> {
  return apiGet<AdminKitFesta[]>(ADMIN_KITS_ENDPOINT);
}

export function criarAdminKitFesta(
  dados: CriarKitFestaPayload,
): Promise<AdminKitFesta> {
  return apiPost<AdminKitFesta>(ADMIN_KITS_ENDPOINT, dados);
}
