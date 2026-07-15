import { getCsrfToken } from "@/lib/csrf";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { AdminKitFesta, CriarKitFestaPayload } from "@/types/adminKits";
import type { ImagemBrinquedo } from "@/types/catalogo";
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
  id: number;
  url: string;
  imagens?: ImagemBrinquedo[];
};

export async function uploadImagemAdminKitFesta(
  kitId: number,
  arquivo: File,
): Promise<UploadImagemKitFestaResponse> {
  return uploadImagensAdminKitFesta(kitId, [arquivo], true);
}

export async function uploadImagensAdminKitFesta(
  kitId: number,
  arquivos: File[],
  primeiraComoPrincipal = false,
): Promise<UploadImagemKitFestaResponse> {
  const csrfToken = await getCsrfToken();
  const formData = new FormData();
  arquivos.forEach((arquivo) => formData.append("imagens", arquivo));
  formData.append("principal", String(primeiraComoPrincipal));

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/kits-festa/${kitId}/imagens/`,
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

export function removerImagemIndividualAdminKitFesta(
  kitId: number,
  imagemId: number,
): Promise<void> {
  return apiDelete<void>(`${ADMIN_KITS_ENDPOINT}${kitId}/imagens/${imagemId}/`);
}

export function definirImagemPrincipalAdminKitFesta(
  kitId: number,
  imagemId: number,
): Promise<ImagemBrinquedo> {
  return apiPost<ImagemBrinquedo>(
    `${ADMIN_KITS_ENDPOINT}${kitId}/imagens/${imagemId}/principal/`,
    {},
  );
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
