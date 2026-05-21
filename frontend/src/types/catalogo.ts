export type CategoriaResumo = {
  id: number;
  nome: string;
  slug: string;
};

export type ImagemBrinquedo = {
  id: number;
  url: string | null;
  alt_text: string;
  principal: boolean;
  ordem: number;
};

export type BrinquedoCatalogo = {
  id: number;
  nome: string;
  descricao: string;
  preco_aluguel: string;
  categoria: CategoriaResumo | null;
  quantidade_disponivel: number;
  imagem_principal: ImagemBrinquedo | null;
  imagens: ImagemBrinquedo[];
};

export type BrinquedoKitResumo = {
  id: number;
  nome: string;
  categoria: CategoriaResumo | null;
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
  preco_aluguel: string;
  itens: ItemKitFesta[];
};
