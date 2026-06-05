import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { getCsrfToken } from "@/lib/csrf";

export interface ItemCarrinho {
  id: number;
  tipo_item: "BRINQUEDO" | "KIT_FESTA" | "KIT_PERSONALIZADO";
  quantidade: number;
  nome_snapshot: string;
  preco_unitario_snapshot: string;
  subtotal_snapshot: string;
  snapshot: {
    periodo_locacao?: {
      tipo: "15_dias" | "30_dias" | "diaria";
      label: string;
      dias: number;
      preco?: string;
    };
    [key: string]: unknown;
  };
}

export interface Carrinho {
  id: number;
  status: string;
  itens: ItemCarrinho[];
}

export function obterCarrinhoAtual(): Promise<Carrinho> {
  return apiGet<Carrinho>("/api/carrinho/atual/");
}

export function adicionarAoCarrinho(dados: {
  tipo_item: "brinquedo" | "kit_festa" | "kit_personalizado";
  brinquedo_id?: number;
  kit_festa_id?: number;
  configuracao_id?: number;
  quantidade: number;
  periodo_locacao?: "15_dias" | "30_dias" | "diaria";
}): Promise<ItemCarrinho> {
  return apiPost<ItemCarrinho>("/api/carrinho/itens/", dados);
}

export function removerItemCarrinho(itemId: number): Promise<void> {
  return apiDelete(`/api/carrinho/itens/${itemId}/`);
}

export function limparCarrinho(): Promise<void> {
  return apiPost("/api/carrinho/limpar/", {});
}

export function converterCarrinhoEmPedido(dados: {
  data_inicio_locacao: string;
  data_fim_locacao: string;
}): Promise<unknown> {
  return apiPost<unknown>("/api/pedidos/converter-carrinho/", dados);
}

export async function atualizarQuantidadeItem(itemId:number, quantidade: number): Promise<any> {

  const csrfToken = await getCsrfToken();

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/carrinho/itens/${itemId}/`,{
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify({quantidade})
  });
  if (!response.ok) throw new Error("Falha ao atualizar a quantidade")
    return response.json();
}