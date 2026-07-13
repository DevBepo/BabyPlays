"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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

function FiltersContent({
  selectedCategory,
  setSelectedCategory,
  categorias,
  onlyAvailable,
  setOnlyAvailable,
  loading,
}: Omit<SidebarFiltersProps, "totalItensFiltrados">) {
  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="space-y-3">
        <FilterSectionTitle>Idade da criança</FilterSectionTitle>
        <div className="grid grid-cols-2 gap-2 lg:block lg:space-y-1.5">
          {AGE_FILTERS.map((age) => (
            <button
              key={age}
              type="button"
              disabled
              className="flex min-h-11 w-full items-center rounded-xl border border-[#FAB555]/30 bg-white/70 px-3 py-2 text-left text-xs font-normal leading-5 text-zinc-500 transition-colors disabled:cursor-not-allowed disabled:opacity-75 lg:min-h-9 lg:text-sm"
            >
              <span>{age}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <FilterSectionTitle>Categorias</FilterSectionTitle>
        <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar lg:max-h-none lg:overflow-visible lg:pr-0">
          <button
            type="button"
            onClick={() => setSelectedCategory("todos")}
            aria-pressed={selectedCategory === "todos"}
            className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-normal leading-5 transition-colors lg:min-h-9 lg:rounded-md ${
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
              className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-normal leading-5 transition-colors lg:min-h-9 lg:rounded-md ${
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
          className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-normal leading-5 transition-colors lg:min-h-9 lg:rounded-md ${
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
  );
}

export function SidebarFilters({
  totalItensFiltrados,
  selectedCategory,
  setSelectedCategory,
  categorias,
  onlyAvailable,
  setOnlyAvailable,
  loading,
}: SidebarFiltersProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeFilters = Number(selectedCategory !== "todos") + Number(onlyAvailable);

  useEffect(() => {
    if (!isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerElement?.focus();
    };
  }, [isMobileOpen]);

  const clearFilters = () => {
    setSelectedCategory("todos");
    setOnlyAvailable(false);
  };

  const filtersProps = {
    selectedCategory,
    setSelectedCategory,
    categorias,
    onlyAvailable,
    setOnlyAvailable,
    loading,
  };

  return (
    <>
      <section className="rounded-2xl border border-[#AB2E97]/15 bg-white/90 p-3 shadow-sm shadow-[#803233]/5 backdrop-blur-sm lg:hidden" aria-label="Controles do catálogo">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">Catálogo</h2>
            <p className="text-xs text-zinc-600">
              {totalItensFiltrados === 1 ? "1 item encontrado" : `${totalItensFiltrados} itens encontrados`}
            </p>
          </div>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isMobileOpen}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#AB2E97]/25 bg-[#F7EAF5] px-4 text-sm font-bold text-[#803233] transition-colors hover:border-[#AB2E97]/45 hover:bg-[#FFF4DF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AB2E97]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filtrar
            {activeFilters > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#AB2E97] px-1.5 text-[11px] text-white" aria-label={`${activeFilters} filtros ativos`}>
                {activeFilters}
              </span>
            ) : null}
          </button>
        </div>
      </section>

      <aside className="custom-scrollbar hidden rounded-3xl border border-[#AB2E97]/15 bg-white/85 p-5 shadow-sm shadow-[#803233]/5 backdrop-blur-sm lg:sticky lg:top-[104px] lg:block lg:max-h-[calc(100vh-120px)] lg:self-start lg:overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#FAB555]/35 pb-3">
          <h2 className="text-base font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">Catálogo</h2>
          <span className="rounded-full bg-[#FFF4DF] px-2.5 py-1 text-xs font-semibold text-[#803233]">
            {totalItensFiltrados} itens
          </span>
        </div>
        <div className="mt-5">
          <FiltersContent {...filtersProps} />
        </div>
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={() => setIsMobileOpen(false)}
            className="absolute inset-0 cursor-default bg-[#2C1615]/35 backdrop-blur-[1px]"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filters-title"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col rounded-t-3xl border border-[#AB2E97]/15 bg-[#FFF9F7] shadow-2xl outline-none"
          >
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-[#803233]/20" aria-hidden="true" />
            <div className="flex items-center justify-between border-b border-[#FAB555]/35 px-4 pb-4 pt-3">
              <div>
                <h2 id="mobile-filters-title" className="text-xl font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">Filtros</h2>
                <p className="mt-0.5 text-xs text-zinc-600">Refine os itens do catálogo</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-[#803233] hover:bg-[#F7EAF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AB2E97]"
              >
                <span aria-hidden="true" className="text-xl leading-none">×</span>
                Fechar
              </button>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <FiltersContent {...filtersProps} />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[#FAB555]/35 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                onClick={clearFilters}
                disabled={activeFilters === 0}
                className="min-h-12 rounded-xl border border-[#AB2E97]/20 bg-white px-4 text-sm font-bold text-[#803233] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="min-h-12 rounded-xl bg-[#AB2E97] px-4 text-sm font-bold text-white shadow-sm shadow-[#AB2E97]/20 hover:bg-[#803233] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F07F40]"
              >
                Ver {totalItensFiltrados} resultado{totalItensFiltrados === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
