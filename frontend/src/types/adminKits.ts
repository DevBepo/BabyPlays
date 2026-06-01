import type { ItemKitFesta } from "@/types/catalogo";

export type AdminKitFesta = {
  id: number;
  nome: string;
  descricao: string;
  preco_aluguel: string;
  ativo: boolean;
  ordem: number;
  itens: ItemKitFesta[];
  criado_em: string;
  atualizado_em: string;
};

export type CriarKitFestaPayload = {
  nome: string;
  descricao: string;
  preco_aluguel: string;
  ativo: boolean;
  ordem: number;
};
