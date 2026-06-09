export type PedidoClienteItem = {
  id: number;
  tipo_item: "BRINQUEDO" | "KIT_FESTA" | "KIT_PERSONALIZADO";
  brinquedo: number | null;
  kit_festa: number | null;
  configuracao_kit_personalizavel: number | null;
  quantidade: number;
  nome_snapshot: string;
  preco_unitario_snapshot: string;
  subtotal_snapshot: string;
  criado_em: string;
};

export type PedidoCliente = {
  id: number;
  cliente: number | null;
  status: string;
  nome_cliente_snapshot: string;
  telefone_cliente_snapshot: string;
  email_cliente_snapshot: string;
  observacoes_cliente: string;
  data_evento_pretendida: string | null;
  data_inicio_locacao: string | null;
  data_fim_locacao: string | null;
  subtotal_itens_snapshot: string;
  endereco_entrega_snapshot: unknown;
  distancia_ida_km_snapshot: string;
  distancia_total_km_snapshot: string;
  valor_por_km_snapshot: string;
  taxa_entrega_retirada_snapshot: string;
  total_estimado_snapshot: string;
  itens: PedidoClienteItem[];
  criado_em: string;
  atualizado_em: string;
};
