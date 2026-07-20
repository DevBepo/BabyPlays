import type { BrinquedoCatalogo } from "@/types/catalogo";

export type StatusCatalogoFiltro =
  | "todos"
  | "disponivel"
  | "alugado"
  | "oculto";

export function formatarMoeda(valor: string): string {
  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return "R$ 0,00";
  }

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function statusAdministrativo(brinquedo: BrinquedoCatalogo) {
  if (brinquedo.ativo === false) {
    return "oculto";
  }
  if (brinquedo.status_catalogo === "disponivel") {
    return "disponivel";
  }
  return "alugado";
}
