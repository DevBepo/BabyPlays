import type { StatusCatalogoFiltro } from "@/lib/admin-brinquedos";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const STATUS_CATALOGO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "disponivel", label: "Disponiveis" },
  { value: "alugado", label: "Alugados" },
  { value: "oculto", label: "Ocultos / desativados" },
];

type BrinquedoAdminFiltersProps = {
  busca: string;
  categoria: string;
  categorias: Array<{ value: string; label: string }>;
  status: StatusCatalogoFiltro;
  totalFiltrado: number;
  total: number;
  temFiltros: boolean;
  onBuscaChange: (value: string) => void;
  onCategoriaChange: (value: string) => void;
  onStatusChange: (value: StatusCatalogoFiltro) => void;
  onClear: () => void;
};

export function BrinquedoAdminFilters({
  busca,
  categoria,
  categorias,
  status,
  totalFiltrado,
  total,
  temFiltros,
  onBuscaChange,
  onCategoriaChange,
  onStatusChange,
  onClear,
}: BrinquedoAdminFiltersProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,1.4fr)_minmax(200px,0.8fr)_minmax(200px,0.8fr)_auto] lg:items-end">
        <Input
          label="Buscar brinquedo"
          type="search"
          value={busca}
          placeholder="Digite o nome do brinquedo"
          onChange={(event) => onBuscaChange(event.target.value)}
        />
        <Select
          label="Categoria"
          value={categoria}
          options={categorias}
          onChange={(event) => onCategoriaChange(event.target.value)}
        />
        <Select
          label="Status"
          value={status}
          options={STATUS_CATALOGO_OPTIONS}
          onChange={(event) =>
            onStatusChange(event.target.value as StatusCatalogoFiltro)
          }
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!temFiltros}
          onClick={onClear}
          className="h-[46px] whitespace-nowrap"
        >
          Limpar filtros
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4">
        <div>
          <h2
            id="lista-brinquedos-titulo"
            className="text-base font-semibold text-zinc-900"
          >
            Catálogo administrativo
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500" aria-live="polite">
            {totalFiltrado} de {total} brinquedo(s)
          </p>
        </div>
        {temFiltros ? (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            Filtros ativos
          </span>
        ) : null}
      </div>
    </div>
  );
}
