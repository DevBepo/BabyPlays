import { apiGet } from "@/lib/api";
import type {
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
