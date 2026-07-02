export type StatusTaxaFrete = "calculada" | "a_confirmar";

export type RegraFreteBairro = {
  id: number;
  uf: string;
  cidade: string;
  bairro: string;
  valor_taxa: string | null;
  status_taxa: StatusTaxaFrete;
  ativo: boolean;
  observacao: string;
  criado_em: string;
  atualizado_em: string;
};

export type RegraFreteBairroPayload = {
  uf?: string;
  cidade?: string;
  bairro?: string;
  valor_taxa?: string | null;
  ativo?: boolean;
  observacao?: string;
};
