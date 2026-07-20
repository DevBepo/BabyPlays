import Image from "next/image";
import Link from "next/link";

import { formatarMoeda, statusAdministrativo } from "@/lib/admin-brinquedos";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { resolveMediaUrl } from "@/lib/media-url";
import type { BrinquedoCatalogo } from "@/types/catalogo";

type BrinquedoAdminCardProps = {
  brinquedo: BrinquedoCatalogo;
  alterandoStatus: boolean;
  removendo: boolean;
  onEdit: () => void;
  onManageUnits: () => void;
  onToggleStatus: () => void;
  onRemove: () => void;
};

export function BrinquedoAdminCard({
  brinquedo,
  alterandoStatus,
  removendo,
  onEdit,
  onManageUnits,
  onToggleStatus,
  onRemove,
}: BrinquedoAdminCardProps) {
  const imagemUrl = resolveMediaUrl(brinquedo.imagem_principal?.url);
  const statusAtual = statusAdministrativo(brinquedo);

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="grid gap-0 md:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_250px]">
        <div className="relative min-h-48 overflow-hidden border-b border-zinc-100 bg-zinc-50 md:min-h-full md:border-b-0 md:border-r">
          {imagemUrl ? (
            <Image
              src={imagemUrl}
              alt={brinquedo.imagem_principal?.alt_text || brinquedo.nome}
              fill
              className="object-contain p-3"
              sizes="(max-width: 768px) 100vw, 210px"
            />
          ) : (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-zinc-400">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm"
                aria-hidden="true"
              >
                ◇
              </span>
              <span className="text-xs font-medium">Sem imagem</span>
            </div>
          )}
        </div>

        <div className="min-w-0 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                {brinquedo.categoria?.nome ?? "Sem categoria"}
              </p>
              <h3 className="mt-1 text-xl font-bold leading-tight text-zinc-900">
                {brinquedo.nome}
              </h3>
            </div>
            {statusAtual === "disponivel" ? (
              <Badge variant="success">Disponível</Badge>
            ) : statusAtual === "oculto" ? (
              <Badge variant="default">Oculto</Badge>
            ) : (
              <Badge variant="warning">Alugado</Badge>
            )}
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">
            {brinquedo.descricao || "Sem descrição cadastrada."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5">
            <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                Unidades fisicas
              </p>
              <p className="mt-1 text-base font-bold text-zinc-900">
                {brinquedo.total_unidades ??
                  brinquedo.quantidade_disponivel ??
                  0}
              </p>
              <p className="text-[11px] text-zinc-500">
                {brinquedo.quantidade_disponivel ?? 0} avulsa(s)
                {(brinquedo.unidades_dedicadas_kits ?? 0) > 0
                  ? ` · ${brinquedo.unidades_dedicadas_kits} em kit(s)`
                  : ""}
              </p>
            </div>
            {[
              ["Diária", brinquedo.preco_diaria],
              ["3 dias", brinquedo.preco_3_dias],
              ["15 dias", brinquedo.preco_15_dias],
              ["30 dias", brinquedo.preco_30_dias],
            ]
              .filter(([, valor]) => valor && Number(valor) > 0)
              .map(([label, valor]) => (
                <div
                  key={label}
                  className="rounded-xl bg-zinc-50 px-3 py-2.5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {label}
                  </p>
                  <p className="mt-1 whitespace-nowrap text-sm font-bold text-zinc-900">
                    {valor ? formatarMoeda(valor) : "—"}
                  </p>
                </div>
              ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 border-t border-zinc-100 bg-zinc-50/60 p-4 md:col-start-2 xl:col-start-auto xl:border-l xl:border-t-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Ações
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1">
              <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onManageUnits}
              >
                Unidades
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-200 pt-3 text-xs font-semibold">
            {brinquedo.ativo !== false ? (
              <button
                type="button"
                disabled={alterandoStatus}
                onClick={onToggleStatus}
                className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50"
              >
                Ocultar
              </button>
            ) : null}
            {brinquedo.ativo !== false ? (
              <Link
                href={`/brinquedos/${brinquedo.id}`}
                target="_blank"
                className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm text-teal-700 transition-colors hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                Ver na loja
              </Link>
            ) : null}
            <button
              type="button"
              disabled={alterandoStatus || removendo}
              onClick={onRemove}
              className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
            >
              {removendo ? "Removendo..." : "Remover"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
