import { apiGet, apiPost } from "@/lib/api";
import type { BrinquedoCatalogo, KitFestaCatalogo } from "@/types/catalogo";
import { getCsrfToken } from "@/lib/csrf";

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

export function criarBrinquedo(dados: {
  nome: string;
  descricao: string;
  categoria?: number;
  preco_aluguel: string | number;
  ativo: boolean;
}): Promise<any> {
  return apiPost(CATALOGO_ENDPOINTS.brinquedos, dados);
}

export async function uploadImagemBrinquedo(brinquedoId: number, arquivo: File): Promise<any> {
  const csrfToken = await getCsrfToken();
  const formData = new FormData();
  formData.append("imagem", arquivo);

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/brinquedos/${brinquedoId}/imagens/`, {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken,
    },
    credentials: "include",
    body: formData,
  });

  if (!response.ok) throw new Error("Falha ao enviar a imagem.");
  return response.json();
}
