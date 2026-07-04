import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  BrinquedoCatalogo,
  CategoriaCatalogo,
  KitFestaCatalogo,
  UnidadeBrinquedoStatus,
} from "@/types/catalogo";
import { getCsrfToken } from "@/lib/csrf";

const CATALOGO_ENDPOINTS = {
  categorias: "/api/categorias/",
  brinquedos: "/api/brinquedos/",
  kitsFesta: "/api/kits-festa/",
};

export function listarCategorias(): Promise<CategoriaCatalogo[]> {
  return apiGet<CategoriaCatalogo[]>(CATALOGO_ENDPOINTS.categorias);
}

export type CriarCategoriaPayload = {
  nome: string;
  slug: string;
  descricao: string;
  ativo: boolean;
  ordem: number;
};

export type AtualizarCategoriaPayload = Partial<CriarCategoriaPayload>;

export function criarCategoria(
  dados: CriarCategoriaPayload,
): Promise<CategoriaCatalogo> {
  return apiPost<CategoriaCatalogo>(CATALOGO_ENDPOINTS.categorias, dados);
}

export function atualizarCategoria(
  categoriaId: number,
  dados: AtualizarCategoriaPayload,
): Promise<CategoriaCatalogo> {
  return apiPatch<CategoriaCatalogo>(
    `${CATALOGO_ENDPOINTS.categorias}${categoriaId}/`,
    dados,
  );
}

export function excluirCategoria(categoriaId: number): Promise<void> {
  return apiDelete<void>(`${CATALOGO_ENDPOINTS.categorias}${categoriaId}/`);
}

export function listarBrinquedos(): Promise<BrinquedoCatalogo[]> {
  return apiGet<BrinquedoCatalogo[]>(CATALOGO_ENDPOINTS.brinquedos);
}

export function listarKitsFesta(): Promise<KitFestaCatalogo[]> {
  return apiGet<KitFestaCatalogo[]>(CATALOGO_ENDPOINTS.kitsFesta);
}

export type InteresseDisponibilidade = {
  id: number;
  brinquedo: number;
  brinquedo_nome: string;
  status: "pendente" | "contatado" | "cancelado";
  cliente_nome?: string;
  cliente_telefone?: string;
  disponibilidade_destacada?: boolean;
  criado_em?: string;
};

export function criarInteresseDisponibilidade(
  brinquedo: number,
): Promise<InteresseDisponibilidade> {
  return apiPost<InteresseDisponibilidade>("/api/interesses-disponibilidade/", { brinquedo });
}

export function listarInteressesAdmin(): Promise<InteresseDisponibilidade[]> {
  return apiGet<InteresseDisponibilidade[]>("/api/admin/interesses-disponibilidade/");
}

export function atualizarInteresseAdmin(
  id: number,
  status: "contatado" | "cancelado",
): Promise<InteresseDisponibilidade> {
  return apiPatch<InteresseDisponibilidade>(`/api/admin/interesses-disponibilidade/${id}/`, { status });
}

export type CriarBrinquedoPayload = {
  nome: string;
  descricao: string;
  categoria?: number;
  preco_diaria?: string | number | null;
  preco_3_dias?: string | number | null;
  preco_15_dias?: string | number | null;
  preco_30_dias?: string | number | null;
  ativo: boolean;
  indisponivel_catalogo?: boolean;
};

export type AtualizarBrinquedoPayload = Partial<CriarBrinquedoPayload>;

type UploadImagemBrinquedoResponse = {
  mensagem: string;
  id: number;
  url: string;
};

export type RemoverCatalogoResponse = {
  detail: string;
  status: "excluido" | "desativado";
};

export type UnidadeBrinquedoAdmin = {
  id: number;
  codigo: string;
  status: UnidadeBrinquedoStatus;
  status_label: string;
  dedicada_kit_festa: boolean;
  kit_festa_nome: string | null;
};

type CriarBrinquedoResponse = {
  id: number;
  nome: string;
  descricao: string;
  categoria: CategoriaCatalogo | null;
  preco_aluguel: string;
  preco_diaria: string | null;
  preco_3_dias: string | null;
  preco_15_dias: string | null;
  preco_30_dias: string | null;
  ativo: boolean;
  indisponivel_catalogo: boolean;
  data_cadastro: string;
  quantidade_disponivel: number;
};

export function listarUnidadesBrinquedo(
  brinquedoId: number,
): Promise<UnidadeBrinquedoAdmin[]> {
  return apiGet<UnidadeBrinquedoAdmin[]>(
    `${CATALOGO_ENDPOINTS.brinquedos}${brinquedoId}/unidades/`,
  );
}

export function criarUnidadeBrinquedo(
  brinquedoId: number,
  dados: { codigo: string },
): Promise<UnidadeBrinquedoAdmin> {
  return apiPost<UnidadeBrinquedoAdmin>(
    `${CATALOGO_ENDPOINTS.brinquedos}${brinquedoId}/unidades/`,
    dados,
  );
}

export function atualizarStatusUnidadeBrinquedo(
  unidadeId: number,
  status: UnidadeBrinquedoStatus,
): Promise<UnidadeBrinquedoAdmin> {
  return apiPatch<UnidadeBrinquedoAdmin>(
    `/api/admin/unidades/${unidadeId}/status/`,
    { status },
  );
}

export function criarBrinquedo(
  dados: CriarBrinquedoPayload,
): Promise<CriarBrinquedoResponse> {
  return apiPost<CriarBrinquedoResponse>(CATALOGO_ENDPOINTS.brinquedos, dados);
}

export function atualizarBrinquedo(
  brinquedoId: number,
  dados: AtualizarBrinquedoPayload,
): Promise<CriarBrinquedoResponse> {
  return apiPatch<CriarBrinquedoResponse>(
    `${CATALOGO_ENDPOINTS.brinquedos}${brinquedoId}/`,
    dados,
  );
}

export function excluirBrinquedo(
  brinquedoId: number,
): Promise<RemoverCatalogoResponse> {
  return apiDelete<RemoverCatalogoResponse>(
    `${CATALOGO_ENDPOINTS.brinquedos}${brinquedoId}/`,
  );
}

export async function uploadImagemBrinquedo(
  brinquedoId: number,
  arquivo: File,
): Promise<UploadImagemBrinquedoResponse> {
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
  return response.json() as Promise<UploadImagemBrinquedoResponse>;
}
