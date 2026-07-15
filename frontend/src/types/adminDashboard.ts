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
  entregas_hoje: number;
  valor_pedidos_mes: {
    total: string;
    inicio: string;
    fim: string;
  };
  ultimos_pedidos: AdminPedidoListItem[];
};
