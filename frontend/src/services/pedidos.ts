import { apiGet } from "@/lib/api";
import type { PedidoCliente } from "@/types/pedidos";

export function listarMeusPedidos(): Promise<PedidoCliente[]> {
  return apiGet<PedidoCliente[]>("/api/pedidos/");
}
