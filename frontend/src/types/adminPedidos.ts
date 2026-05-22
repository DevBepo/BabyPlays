export type AdminPedidoStatus =
  | "aguardando_analise"
  | "reservado"
  | "confirmado"
  | "em_locacao"
  | "retirado"
  | "cancelado";

export type AdminPedidoClienteResumo = {
  id: number;
  nome: string;
  telefone: string;
  ativo: boolean;
} | null;

export type AdminPedidoClienteSnapshot = {
  nome: string;
  email: string;
  telefone: string;
};

export type AdminPedidoListItem = {
  id: number;
  status: AdminPedidoStatus;
  cliente: AdminPedidoClienteResumo;
  cliente_snapshot: AdminPedidoClienteSnapshot;
  data_evento_pretendida: string;
  data_inicio_locacao: string;
  data_fim_locacao: string;
  total_estimado_snapshot: string;
  criado_em: string;
  atualizado_em: string;
  tem_aceite_contrato: boolean;
  possui_reservas_ativas: boolean;
  quantidade_itens: number;
};

export type AdminPedidosListParams = {
  busca?: string;
  status?: string;
  page?: number;
};

export type AdminPedidosPaginatedResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminPedidoListItem[];
};
