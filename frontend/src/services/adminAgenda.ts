import { apiGet } from "@/lib/api";
import type {
  AdminAgendaParams,
  AdminAgendaResponse,
} from "@/types/adminAgenda";

function buildAgendaQueryString(params: AdminAgendaParams) {
  const query = new URLSearchParams({
    inicio: params.inicio,
    fim: params.fim,
  });

  if (params.tipo && params.tipo !== "todos") {
    query.set("tipo", params.tipo);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  return `?${query.toString()}`;
}

export function obterAgendaAdmin(
  params: AdminAgendaParams,
): Promise<AdminAgendaResponse> {
  return apiGet<AdminAgendaResponse>(
    `/api/admin/agenda/${buildAgendaQueryString(params)}`,
  );
}
