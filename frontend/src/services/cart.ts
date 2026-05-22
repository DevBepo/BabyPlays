import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export interface ItemCarrinho {
  id: number;
  tipo_item: "BRINQUEDO" | "KIT_FESTA" | "KIT_PERSONALIZADO";
  quantidade: number;
  nome_snapshot: string;
  preco_unitario_snapshot: string;
  subtotal_snapshot: string;
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
  tipo_item: "BRINQUEDO" | "KIT_FESTA" | "KIT_PERSONALIZADO";
  brinquedo_id?: number;
  kit_festa_id?: number;
  configuracao_id?: number;
  quantidade: number;
}): Promise<ItemCarrinho> {
  return apiPost<ItemCarrinho>("/api/carrinho/itens/", dados);
}