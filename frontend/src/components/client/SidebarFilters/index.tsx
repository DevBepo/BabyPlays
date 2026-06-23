"use client";

import type { ReactNode } from "react";

const AGE_FILTERS = [
  "0 a 6 meses",
  "6 a 12 meses",
  "1 a 2 anos",
  "2 a 3 anos",
  "3 a 4 anos",
  "4+ anos",
];

const FILTER_ICON_COLORS = [
  "text-teal-600",
  "text-emerald-600",
  "text-rose-500",
  "text-violet-600",
  "text-sky-600",
  "text-cyan-600",
  "text-amber-500",
  "text-zinc-500",
];

function FilterSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[13px] font-semibold leading-5 text-zinc-800">
      {children}
    </h2>
  );
}

function FilterIcon({ colorClass = "text-teal-600" }: { colorClass?: string }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center ${colorClass}`}
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.5 7.5 12 5l2.5 2.5" />
        <path d="M14.5 16.5 12 19l-2.5-2.5" />
        <path d="M7.5 14.5 5 12l2.5-2.5" />
        <path d="M16.5 9.5 19 12l-2.5 2.5" />
        <path d="M12 9.5 14.5 12 12 14.5 9.5 12 12 9.5Z" />
      </svg>
    </span>
  );
}

type SidebarFiltersProps = {
  totalItensFiltrados: number;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categorias: Array<[string, string]>;
  onlyAvailable: boolean;
  setOnlyAvailable: (available: boolean) => void;
  loading: boolean;
};

export function SidebarFilters({
  totalItensFiltrados,
  selectedCategory,
  setSelectedCategory,
  categorias,
  onlyAvailable,
  setOnlyAvailable,
  loading,
}: SidebarFiltersProps) {
  return (
    <aside className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-[104px] lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <h1 className="text-base font-black text-zinc-950">Catálogo</h1>
        <span className="text-xs font-semibold text-zinc-500">
          {totalItensFiltrados} itens
        </span>
      </div>

      <div className="mt-5 space-y-6">
        <section className="space-y-3">
          <FilterSectionTitle>Idade da criança</FilterSectionTitle>
          <div className="space-y-1.5">
            {AGE_FILTERS.map((age) => (
              <button
                key={age}
                type="button"
                disabled
                className="flex min-h-9 w-full items-center rounded-md border border-zinc-200/70 bg-white px-3 py-2 text-left text-sm font-normal leading-5 text-zinc-500 transition-colors disabled:cursor-not-allowed disabled:opacity-75"
              >
                <span>{age}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <FilterSectionTitle>Categorias</FilterSectionTitle>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory("todos")}
              aria-pressed={selectedCategory === "todos"}
              className={`flex min-h-9 w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm font-normal leading-5 transition-colors ${
                selectedCategory === "todos"
                  ? "border-teal-500 bg-teal-50/70 text-zinc-900"
                  : "border-transparent bg-white text-zinc-700 hover:border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <FilterIcon colorClass={FILTER_ICON_COLORS[0]} />
              <span className="min-w-0 flex-1">Todos</span>
            </button>

            {categorias.map(([slug, nome], index) => (
              <button
                key={slug}
                type="button"
                onClick={() => setSelectedCategory(slug)}
                aria-pressed={selectedCategory === slug}
                className={`flex min-h-9 w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm font-normal leading-5 transition-colors ${
                  selectedCategory === slug
                    ? "border-teal-500 bg-teal-50/70 text-zinc-900"
                    : "border-transparent bg-white text-zinc-700 hover:border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <FilterIcon
                  colorClass={
                    FILTER_ICON_COLORS[(index + 1) % FILTER_ICON_COLORS.length]
                  }
                />
                <span className="line-clamp-1 min-w-0 flex-1">{nome}</span>
              </button>
            ))}

            {categorias.length === 0 && !loading ? (
              <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-500">
                As categorias aparecem quando houver dados ativos na API.
              </p>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <FilterSectionTitle>Disponibilidade</FilterSectionTitle>
          <button
            type="button"
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            aria-pressed={onlyAvailable}
            className={`flex min-h-9 w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm font-normal leading-5 transition-colors ${
              onlyAvailable
                ? "border-teal-500 bg-teal-50/70 text-zinc-900"
                : "border-transparent bg-white text-zinc-700 hover:border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <FilterIcon colorClass="text-emerald-600" />
            <span className="min-w-0 flex-1">Disponível</span>
          </button>
        </section>
      </div>
    </aside>
  );
}
