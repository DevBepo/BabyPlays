import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  RegraFreteBairro,
  RegraFreteBairroPayload,
} from "@/types/adminEntregas";

const ENDPOINT = "/api/admin/regras-frete-bairro/";

export function listarRegrasFreteBairro(): Promise<RegraFreteBairro[]> {
  return apiGet<RegraFreteBairro[]>(ENDPOINT);
}

export function criarRegraFreteBairro(
  payload: RegraFreteBairroPayload,
): Promise<RegraFreteBairro> {
  return apiPost<RegraFreteBairro>(ENDPOINT, payload);
}

export function atualizarRegraFreteBairro(
  id: number,
  payload: RegraFreteBairroPayload,
): Promise<RegraFreteBairro> {
  return apiPatch<RegraFreteBairro>(`${ENDPOINT}${id}/`, payload);
}

export function excluirRegraFreteBairro(id: number): Promise<void> {
  return apiDelete<void>(`${ENDPOINT}${id}/`);
}
