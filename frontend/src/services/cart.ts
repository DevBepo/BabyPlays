import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

export interface ItemCarrinho {
  id: number;
  tipo_item: "BRINQUEDO" | "KIT_FESTA" | "KIT_PERSONALIZADO";
  quantidade: number;
  nome_snapshot: string;
  imagem_url: string | null;
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
  return apiDelete("/api/carrinho/limpar/");
}

export function converterCarrinhoEmPedido(dados: {
  nome: string;
  telefone: string;
  email: string;
  data_evento_pretendida: string;
  data_inicio_locacao: string;
  data_fim_locacao: string;
  cep: string;
  numero: string;
  complemento?: string;
  observacoes?: string;
  contrato_aceito: boolean;
  contrato_id: number;
  contrato_versao: string;
}): Promise<unknown> {
  return apiPost<unknown>("/api/pedidos/converter-carrinho/", dados);
}

export function atualizarQuantidadeItem(
  itemId: number,
  quantidade: number,
): Promise<ItemCarrinho> {
  return apiPatch<ItemCarrinho>(`/api/carrinho/itens/${itemId}/`, { quantidade });
}
