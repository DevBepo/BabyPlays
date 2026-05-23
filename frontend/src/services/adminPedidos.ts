import { apiGet, apiPost } from "@/lib/api";
import type {
  AdminPedidoActionResponse,
  AdminPedidoDetail,
  AdminPedidosListParams,
  AdminPedidosPaginatedResponse,
} from "@/types/adminPedidos";

function buildQueryString(params: AdminPedidosListParams = {}) {
  const query = new URLSearchParams();

  if (params.busca?.trim()) {
    query.set("busca", params.busca.trim());
  }

  if (params.status && params.status !== "todos") {
    query.set("status", params.status);
  }

  if (params.page && params.page > 1) {
    query.set("page", String(params.page));
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function listarPedidosAdmin(
  params?: AdminPedidosListParams,
): Promise<AdminPedidosPaginatedResponse> {
  return apiGet<AdminPedidosPaginatedResponse>(
    `/api/admin/pedidos/${buildQueryString(params)}`,
  );
}

export function obterAdminPedido(id: number | string): Promise<AdminPedidoDetail> {
  return apiGet<AdminPedidoDetail>(`/api/admin/pedidos/${id}/`);
}

export function reservarUnidadesAdminPedido(
  id: number | string,
): Promise<AdminPedidoActionResponse> {
  return apiPost<AdminPedidoActionResponse>(
    `/api/admin/pedidos/${id}/reservar-unidades/`,
    {},
  );
}

export function confirmarAdminPedido(
  id: number | string,
): Promise<AdminPedidoActionResponse> {
  return apiPost<AdminPedidoActionResponse>(
    `/api/admin/pedidos/${id}/confirmar/`,
    {},
  );
}

export function iniciarLocacaoAdminPedido(
  id: number | string,
): Promise<AdminPedidoActionResponse> {
  return apiPost<AdminPedidoActionResponse>(
    `/api/admin/pedidos/${id}/iniciar-locacao/`,
    {},
  );
}

export function registrarRetiradaAdminPedido(
  id: number | string,
): Promise<AdminPedidoActionResponse> {
  return apiPost<AdminPedidoActionResponse>(
    `/api/admin/pedidos/${id}/registrar-retirada/`,
    {},
  );
}
