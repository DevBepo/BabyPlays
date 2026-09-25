import type { AdminPedidoStatus } from "./adminPedidos";

export type AdminAgendaEventType =
  | "aguardando_analise"
  | "reserva"
  | "entrega"
  | "retirada"
  | "contrato_pendente"
  | "locacao_em_andamento";

export type AdminAgendaTypeFilter = AdminAgendaEventType | "todos";

export type AdminAgendaPeriod = {
  inicio: string;
  fim: string;
};

export type AdminAgendaOrder = {
  id: number;
  status: AdminPedidoStatus;
  cliente_nome: string;
  cliente_telefone: string;
  data_inicio_locacao: string | null;
  data_fim_locacao: string | null;
  tem_aceite_contrato: boolean;
  tem_kit_festa: boolean;
};

export type AdminAgendaUnit = {
  id: number;
  codigo: string;
  brinquedo: string;
  status: string;
};

export type AdminAgendaEvent = {
  id: string;
  tipo: AdminAgendaEventType;
  label: string;
  data: string;
  hora_inicio: string | null;
  pedido: AdminAgendaOrder;
  unidades: AdminAgendaUnit[];
};

export type AdminAgendaSummary = {
  total: number;
  sem_data: number;
  por_tipo: Record<AdminAgendaEventType, number>;
};

export type AdminAgendaUnscheduledOrder = {
  id: number;
  status: AdminPedidoStatus;
  cliente_nome: string;
  cliente_telefone: string;
  criado_em: string;
  tem_aceite_contrato: boolean;
  quantidade_itens: number;
};

export type AdminAgendaResponse = {
  periodo: AdminAgendaPeriod;
  eventos: AdminAgendaEvent[];
  pedidos_sem_data: AdminAgendaUnscheduledOrder[];
  resumo: AdminAgendaSummary;
};

export type AdminAgendaParams = {
  inicio: string;
  fim: string;
  tipo?: AdminAgendaTypeFilter;
  status?: AdminPedidoStatus;
};
