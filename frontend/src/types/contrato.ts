export type ContratoLocacao = {
  id: number;
  titulo: string;
  versao: string;
  texto: string;
  ativo?: boolean;
  criado_em?: string;
  atualizado_em?: string;
};

export type AtualizarContratoPayload = {
  titulo: string;
  texto: string;
};
