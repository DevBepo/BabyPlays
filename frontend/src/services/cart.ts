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
  tipo_item: "brinquedo" | "kit_festa" | "kit_personalizado";
  brinquedo_id?: number;
  kit_festa_id?: number;
  configuracao_id?: number;
  quantidade: number;
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
}): Promise<any> {
  return apiPost("/api/pedidos/converter-carrinho/", dados);
}