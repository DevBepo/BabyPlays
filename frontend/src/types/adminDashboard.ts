import type { AdminPedidoListItem } from "@/types/adminPedidos";

export type AdminDashboardResponse = {
  gerado_em: string;
  pedidos_aguardando_analise: {
    total: number;
    novos_hoje: number;
  };
  unidades: {
    em_locacao: number;
    total_operacionais: number;
    em_manutencao: number;
  };
  operacao_semana: {
    inicio: string;
    fim: string;
    entregas: number;
    retiradas: number;
  };
  ultimos_pedidos: AdminPedidoListItem[];
};
