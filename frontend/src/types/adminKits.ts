import type { ItemKitFesta, PeriodoLocacaoDisponivel } from "@/types/catalogo";

export type AdminKitFesta = {
  id: number;
  nome: string;
  descricao: string;
  imagem_url: string | null;
  preco_aluguel: string;
  preco_diaria: string | null;
  preco_15_dias: string | null;
  preco_30_dias: string | null;
  permite_diaria: boolean;
  periodos_disponiveis: PeriodoLocacaoDisponivel[];
  ativo: boolean;
  ordem: number;
  itens: ItemKitFesta[];
  criado_em: string;
  atualizado_em: string;
};

export type CriarKitFestaPayload = {
  nome: string;
  descricao: string;
  preco_diaria?: string | null;
  preco_15_dias?: string | null;
  preco_30_dias?: string | null;
  ativo: boolean;
  ordem: number;
};
