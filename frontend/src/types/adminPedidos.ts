export type AdminPedidoStatus =
  | "aguardando_analise"
  | "reservado"
  | "confirmado"
  | "em_locacao"
  | "retirado"
  | "cancelado";

export type AdminPedidoAction =
  | "reservar_unidades"
  | "confirmar"
  | "iniciar_locacao"
  | "registrar_retirada";

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

export type AdminPedidoUsuarioResumo = {
  id: number;
  email: string;
} | null;

export type AdminPedidoEnderecoEntrega = {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

export type AdminPedidoValores = {
  subtotal_itens_snapshot: string;
  distancia_ida_km_snapshot: string;
  distancia_total_km_snapshot: string;
  valor_por_km_snapshot: string;
  taxa_entrega_retirada_snapshot: string;
  total_estimado_snapshot: string;
};

export type AdminPedidoResumoComposicao = {
  tipo: string;
  brinquedo?: {
    id: number | null;
    nome: string;
  };
  kit_festa?: {
    id: number | null;
    nome: string;
  };
  configuracao?: {
    id: number | null;
    nome: string;
  };
  itens?: unknown[];
};

export type AdminPedidoItem = {
  id: number;
  tipo_item: string;
  quantidade: number;
  nome_snapshot: string;
  preco_unitario_snapshot: string;
  subtotal_snapshot: string;
  resumo_composicao: AdminPedidoResumoComposicao;
  criado_em: string;
};

export type AdminPedidoAceiteContrato = {
  id: number;
  contrato: number;
  versao_aceita: string;
  titulo_aceito: string;
  texto_aceito: string;
  aceito_em: string;
  nome_cliente_snapshot: string;
  email_cliente_snapshot: string;
  ip: string;
  user_agent: string;
} | null;

export type AdminPedidoUnidadeResumo = {
  id: number;
  codigo: string;
  status: string;
};

export type AdminPedidoBrinquedoResumo = {
  id: number;
  nome: string;
};

export type AdminPedidoReserva = {
  id: number;
  item_pedido: number | null;
  unidade: AdminPedidoUnidadeResumo;
  brinquedo: AdminPedidoBrinquedoResumo;
  data_inicio: string;
  data_fim: string;
  status: string;
};

export type AdminPedidoListItem = {
  id: number;
  status: AdminPedidoStatus;
  cliente: AdminPedidoClienteResumo;
  cliente_snapshot: AdminPedidoClienteSnapshot;
  data_evento_pretendida: string | null;
  data_inicio_locacao: string | null;
  data_fim_locacao: string | null;
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

export type AdminPedidoDetail = {
  id: number;
  status: AdminPedidoStatus;
  usuario: AdminPedidoUsuarioResumo;
  cliente: AdminPedidoClienteResumo;
  cliente_snapshot: AdminPedidoClienteSnapshot;
  data_evento_pretendida: string | null;
  data_inicio_locacao: string | null;
  data_fim_locacao: string | null;
  observacoes_cliente: string;
  endereco_entrega: AdminPedidoEnderecoEntrega;
  valores: AdminPedidoValores;
  itens: AdminPedidoItem[];
  aceite_contrato: AdminPedidoAceiteContrato;
  reservas: AdminPedidoReserva[];
  unidades_reservadas: AdminPedidoUnidadeResumo[];
  tem_aceite_contrato: boolean;
  possui_reservas_ativas: boolean;
  confirmado_em: string | null;
  confirmado_por: AdminPedidoUsuarioResumo;
  acoes_disponiveis: AdminPedidoAction[];
  criado_em: string;
  atualizado_em: string;
  historico: Array<{
    id: number;
    acao: string;
    dados: Record<string, unknown>;
    usuario_admin: number | null;
    criado_em: string;
  }>;
};

export type AdminPedidoActionResponse = {
  id?: number;
  pedido_id?: number;
  status: AdminPedidoStatus;
  reservas?: AdminPedidoReserva[];
  reservas_criadas?: AdminPedidoReserva[];
  reservas_encerradas?: Array<{
    id: number;
    status: string;
  }>;
  unidades_atualizadas?: Array<{
    id: number;
    status: string;
  }>;
  confirmado_em?: string | null;
  confirmado_por?: number | null;
};
