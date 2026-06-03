import { getCsrfToken } from "@/lib/csrf";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { AdminKitFesta, CriarKitFestaPayload } from "@/types/adminKits";
import type { RemoverCatalogoResponse } from "@/services/catalogo";

const ADMIN_KITS_ENDPOINT = "/api/kits-festa/";

export function listarAdminKitsFesta(): Promise<AdminKitFesta[]> {
  return apiGet<AdminKitFesta[]>(ADMIN_KITS_ENDPOINT);
}

export function criarAdminKitFesta(
  dados: CriarKitFestaPayload,
): Promise<AdminKitFesta> {
  return apiPost<AdminKitFesta>(ADMIN_KITS_ENDPOINT, dados);
}

export type AtualizarKitFestaPayload = Partial<CriarKitFestaPayload>;

export function atualizarAdminKitFesta(
  kitId: number,
  dados: AtualizarKitFestaPayload,
): Promise<AdminKitFesta> {
  return apiPatch<AdminKitFesta>(`${ADMIN_KITS_ENDPOINT}${kitId}/`, dados);
}

export function excluirAdminKitFesta(
  kitId: number,
): Promise<RemoverCatalogoResponse> {
  return apiDelete<RemoverCatalogoResponse>(`${ADMIN_KITS_ENDPOINT}${kitId}/`);
}

type UploadImagemKitFestaResponse = {
  mensagem: string;
  url: string;
};

export async function uploadImagemAdminKitFesta(
  kitId: number,
  arquivo: File,
): Promise<UploadImagemKitFestaResponse> {
  const csrfToken = await getCsrfToken();
  const formData = new FormData();
  formData.append("imagem", arquivo);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/kits-festa/${kitId}/imagem/`,
    {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Falha ao enviar a imagem do kit festa.");
  }

  return response.json() as Promise<UploadImagemKitFestaResponse>;
}

export async function removerImagemAdminKitFesta(kitId: number): Promise<void> {
  const csrfToken = await getCsrfToken();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/kits-festa/${kitId}/imagem/`,
    {
      method: "DELETE",
      headers: {
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Falha ao remover a imagem do kit festa.");
  }
}
