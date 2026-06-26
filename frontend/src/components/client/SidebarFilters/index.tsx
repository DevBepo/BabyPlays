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
  "text-[#AB2E97]",
  "text-[#76CFC8]",
  "text-[#EA524B]",
  "text-[#F07F40]",
  "text-[#FAB555]",
  "text-[#803233]",
  "text-[#AB2E97]",
  "text-[#76CFC8]",
];

function FilterSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[13px] font-bold leading-5 text-[#2C1615] [font-family:var(--font-fredoka)]">
      {children}
    </h2>
  );
}

function FilterIcon({ colorClass = "text-[#AB2E97]" }: { colorClass?: string }) {
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
    <aside className="rounded-3xl border border-[#AB2E97]/15 bg-white/80 p-5 shadow-sm shadow-[#803233]/5 backdrop-blur-sm lg:sticky lg:top-[104px] lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between border-b border-[#FAB555]/35 pb-3">
        <h1 className="text-base font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">Catálogo</h1>
        <span className="rounded-full bg-[#FFF4DF] px-2.5 py-1 text-xs font-semibold text-[#803233]">
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
                className="flex min-h-9 w-full items-center rounded-xl border border-[#FAB555]/30 bg-white/70 px-3 py-2 text-left text-sm font-normal leading-5 text-zinc-500 transition-colors disabled:cursor-not-allowed disabled:opacity-75"
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
                  ? "border-[#AB2E97]/40 bg-[#F7EAF5] text-[#2C1615]"
                  : "border-transparent bg-white/70 text-zinc-700 hover:border-[#76CFC8]/40 hover:bg-[#E8F8F6]"
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
                    ? "border-[#AB2E97]/40 bg-[#F7EAF5] text-[#2C1615]"
                    : "border-transparent bg-white/70 text-zinc-700 hover:border-[#76CFC8]/40 hover:bg-[#E8F8F6]"
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
              <p className="rounded-xl bg-[#FFF4DF] px-3 py-2 text-xs leading-5 text-[#803233]">
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
                ? "border-[#76CFC8]/60 bg-[#E8F8F6] text-[#2C1615]"
                : "border-transparent bg-white/70 text-zinc-700 hover:border-[#76CFC8]/40 hover:bg-[#E8F8F6]"
            }`}
          >
            <FilterIcon colorClass="text-[#76CFC8]" />
            <span className="min-w-0 flex-1">Disponível</span>
          </button>
        </section>
      </div>
    </aside>
  );
}
