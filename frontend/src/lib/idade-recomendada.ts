export type IdadeUnidade = "meses" | "anos";

export type IdadeFormValue = {
  valor: string;
  unidade: IdadeUnidade;
};

export type IdadeFaixaCatalogo = {
  value: string;
  label: string;
  minMeses: number;
  maxMeses: number | null;
};

export const IDADE_FAIXAS_CATALOGO: IdadeFaixaCatalogo[] = [
  { value: "0-6", label: "0 a 6 meses", minMeses: 0, maxMeses: 6 },
  { value: "6-12", label: "6 a 12 meses", minMeses: 6, maxMeses: 12 },
  { value: "12-24", label: "1 a 2 anos", minMeses: 12, maxMeses: 24 },
  { value: "24-36", label: "2 a 3 anos", minMeses: 24, maxMeses: 36 },
  { value: "36-48", label: "3 a 4 anos", minMeses: 36, maxMeses: 48 },
  { value: "48-plus", label: "4+ anos", minMeses: 48, maxMeses: null },
];

export function idadeMesesParaForm(valor?: number | null): IdadeFormValue {
  if (valor === null || valor === undefined) {
    return { valor: "", unidade: "meses" };
  }

  if (valor >= 12 && valor % 12 === 0) {
    return { valor: String(valor / 12), unidade: "anos" };
  }

  return { valor: String(valor), unidade: "meses" };
}

export function idadeFormParaMeses(
  valor: string,
  unidade: IdadeUnidade,
): number | null {
  if (valor.trim() === "") {
    return null;
  }

  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    return null;
  }

  return unidade === "anos" ? Math.trunc(numero * 12) : Math.trunc(numero);
}

function formatarMeses(valor: number): string {
  if (valor === 0) {
    return "desde o nascimento";
  }

  if (valor >= 12 && valor % 12 === 0) {
    const anos = valor / 12;
    return anos === 1 ? "1 ano" : `${anos} anos`;
  }

  return valor === 1 ? "1 mês" : `${valor} meses`;
}

export function formatarIdadeRecomendada(
  idadeMinimaMeses?: number | null,
  idadeMaximaMeses?: number | null,
): string | null {
  if (idadeMinimaMeses === null && idadeMaximaMeses === null) {
    return null;
  }
  if (idadeMinimaMeses === undefined && idadeMaximaMeses === undefined) {
    return null;
  }

  if (idadeMinimaMeses !== null && idadeMinimaMeses !== undefined) {
    const minima = formatarMeses(idadeMinimaMeses);

    if (idadeMaximaMeses !== null && idadeMaximaMeses !== undefined) {
      const maxima = formatarMeses(idadeMaximaMeses);
      if (idadeMinimaMeses === 0) {
        if (idadeMaximaMeses === 0) {
          return "Desde o nascimento";
        }
        return `Desde o nascimento até ${maxima}`;
      }
      return `${minima} a ${maxima}`;
    }

    if (idadeMinimaMeses === 0) {
      return "Desde o nascimento";
    }
    return `A partir de ${minima}`;
  }

  if (idadeMaximaMeses !== null && idadeMaximaMeses !== undefined) {
    return `Até ${formatarMeses(idadeMaximaMeses)}`;
  }

  return null;
}

export function brinquedoAtendeFaixaIdade(
  idadeMinimaMeses: number | null | undefined,
  idadeMaximaMeses: number | null | undefined,
  faixaValue: string,
): boolean {
  const faixa = IDADE_FAIXAS_CATALOGO.find((item) => item.value === faixaValue);
  if (!faixa) {
    return true;
  }

  if (idadeMinimaMeses === null && idadeMaximaMeses === null) {
    return false;
  }
  if (idadeMinimaMeses === undefined && idadeMaximaMeses === undefined) {
    return false;
  }

  const brinquedoMinimo = idadeMinimaMeses ?? 0;
  const brinquedoMaximo = idadeMaximaMeses ?? Number.POSITIVE_INFINITY;
  const faixaMaxima = faixa.maxMeses ?? Number.POSITIVE_INFINITY;

  return brinquedoMinimo <= faixaMaxima && brinquedoMaximo >= faixa.minMeses;
}
