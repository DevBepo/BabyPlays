import { apiGet, apiPatch, apiPut } from "@/lib/api";
import type { AtualizarContratoPayload, ContratoLocacao } from "@/types/contrato";

export function obterContratoVigente(): Promise<ContratoLocacao> {
  return apiGet<ContratoLocacao>("/api/contrato/vigente/");
}

export function obterAdminContrato(): Promise<ContratoLocacao> {
  return apiGet<ContratoLocacao>("/api/admin/contrato/");
}

export function salvarAdminContrato(
  dados: AtualizarContratoPayload,
  existeContrato: boolean,
): Promise<ContratoLocacao> {
  if (existeContrato) {
    return apiPatch<ContratoLocacao>("/api/admin/contrato/", dados);
  }

  return apiPut<ContratoLocacao>("/api/admin/contrato/", dados);
}
