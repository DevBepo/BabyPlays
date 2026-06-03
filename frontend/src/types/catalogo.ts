export type CategoriaResumo = {
  id: number;
  nome: string;
  slug: string;
};

export type CategoriaCatalogo = CategoriaResumo & {
  descricao?: string;
  ativo?: boolean;
  ordem?: number;
  criado_em?: string;
  atualizado_em?: string;
};

export type ImagemBrinquedo = {
  id: number;
  url: string | null;
  alt_text: string;
  principal: boolean;
  ordem: number;
};

export type PeriodoLocacao = "15_dias" | "30_dias" | "diaria";

export type PeriodoLocacaoDisponivel = {
  tipo: PeriodoLocacao;
  label: string;
  dias: number;
  preco: string;
};

export type BrinquedoCatalogo = {
  id: number;
  nome: string;
  descricao: string;
  preco_aluguel: string;
  preco_diaria: string | null;
  preco_15_dias: string | null;
  preco_30_dias: string | null;
  permite_diaria: boolean;
  periodos_disponiveis: PeriodoLocacaoDisponivel[];
  ativo?: boolean;
  categoria: CategoriaResumo | null;
  quantidade_disponivel: number;
  imagem_principal: ImagemBrinquedo | null;
  imagens: ImagemBrinquedo[];
};

export type BrinquedoKitResumo = {
  id: number;
  nome: string;
  categoria: CategoriaResumo | null;
  permite_diaria?: boolean;
  imagem_principal: ImagemBrinquedo | null;
};

export type ItemKitFesta = {
  id: number;
  quantidade: number;
  ordem: number;
  brinquedo: BrinquedoKitResumo;
};

export type KitFestaCatalogo = {
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
  itens: ItemKitFesta[];
};
