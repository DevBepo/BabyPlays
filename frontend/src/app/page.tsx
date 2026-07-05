"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { Header } from "@/components/client/Header";
import { ProductCard } from "@/components/client/ProductCard";
import { SubNavbar } from "@/components/client/SubNavBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCart } from "@/hooks/useCart";
import { listarBrinquedos, listarKitsFesta } from "@/services/catalogo";
import { Footer } from "@/components/client/Footer";
import { adicionarAoCarrinho } from "@/services/cart";
import { resolveMediaUrl } from "@/lib/media-url";
import type { ApiError } from "@/types/api";
import type {
  BrinquedoCatalogo,
  KitFestaCatalogo,
  PeriodoLocacao,
  PeriodoLocacaoDisponivel,
} from "@/types/catalogo";

// IMPORTANDO AS NOSSAS DUAS SIDEBARS!
import { SidebarFilters } from "@/components/client/SidebarFilters";
import { SidebarCart } from "@/components/client/SidebarCart";

type CatalogoError = {
  brinquedos: string | null;
  kits: string | null;
};

const initialErrors: CatalogoError = {
  brinquedos: null,
  kits: null,
};

function formatPrice(value: string) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return value;
  return numberValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getCartErrorMessage(error: unknown) {
  const apiError = error as Partial<ApiError> | null;
  if (apiError?.message) return apiError.message;
  return "Nao foi possivel adicionar ao carrinho. Tente novamente.";
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isVisibleCategoryFilter(nome: string, slug: string) {
  const normalizedNome = normalizeText(nome);
  const normalizedSlug = normalizeText(slug);
  const isCodexTest =
    (normalizedNome.includes("codex") && normalizedNome.includes("teste")) ||
    (normalizedSlug.includes("codex") && normalizedSlug.includes("teste"));
  return !isCodexTest;
}

function matchesSearch(brinquedo: BrinquedoCatalogo, search: string) {
  if (!search) return true;
  const searchable = [brinquedo.nome, brinquedo.descricao, brinquedo.categoria?.nome ?? ""]
    .map(normalizeText).join(" ");
  return searchable.includes(search);
}

function matchesKitSearch(kit: KitFestaCatalogo, search: string) {
  if (!search) return true;
  const itensSearchable = kit.itens.flatMap((item) => [item.brinquedo.nome, item.brinquedo.categoria?.nome ?? ""]);
  const searchable = [kit.nome, kit.descricao, ...itensSearchable].map(normalizeText).join(" ");
  return searchable.includes(search);
}

function getBrinquedoImage(brinquedo: BrinquedoCatalogo) {
  if (brinquedo.imagem_principal?.url) return brinquedo.imagem_principal;
  return brinquedo.imagens.find((imagem) => imagem.url);
}

function getKitImage(kit: KitFestaCatalogo) {
  if (kit.imagem_url) return { url: kit.imagem_url, alt_text: kit.nome };
  return kit.itens.find((item) => item.brinquedo.imagem_principal?.url)?.brinquedo.imagem_principal;
}

function scrollCarousel(ref: RefObject<HTMLDivElement | null>, direction: -1 | 1) {
  const carousel = ref.current;
  if (!carousel) return;
  carousel.scrollBy({ left: direction * carousel.clientWidth, behavior: "smooth" });
}

type CarouselScrollState = { canScrollPrevious: boolean; canScrollNext: boolean; };

const initialCarouselScrollState: CarouselScrollState = { canScrollPrevious: false, canScrollNext: false };

function readCarouselScrollState(ref: RefObject<HTMLDivElement | null>): CarouselScrollState {
  const element = ref.current;
  if (!element) return initialCarouselScrollState;
  const maxScrollLeft = element.scrollWidth - element.clientWidth;
  return { canScrollPrevious: element.scrollLeft > 4, canScrollNext: element.scrollLeft < maxScrollLeft - 4 };
}

function LoadingCarousel() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-[356px] w-[280px] shrink-0 animate-pulse rounded-3xl border border-[#AB2E97]/10 bg-white/80 shadow-sm sm:w-[288px]">
          <div className="h-48 bg-[#FFF4DF]" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-24 rounded bg-[#F7EAF5]" />
            <div className="h-5 w-3/4 rounded bg-[#F7EAF5]" />
            <div className="h-4 w-full rounded bg-[#E8F8F6]" />
            <div className="h-10 w-full rounded-xl bg-[#FDECEB]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card padding="lg" className="items-center rounded-3xl border-[#FAB555]/40 bg-white/75 text-center shadow-sm">
      <h3 className="text-lg font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">{message}</p>
    </Card>
  );
}

function CarouselButton({ direction, onClick, visible, ariaLabel }: { direction: "left" | "right"; onClick: () => void; visible: boolean; ariaLabel: string; }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#AB2E97]/20 bg-white/95 text-[#AB2E97] shadow-md shadow-[#AB2E97]/15 transition-colors hover:border-[#AB2E97] hover:bg-[#F7EAF5] sm:flex ${direction === "left" ? "left-2" : "right-2"}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {direction === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </button>
  );
}

function KitFestaCard({ kit }: { kit: KitFestaCatalogo }) {
  const { openCart, refreshCart } = useCart();
  const [adicionando, setAdicionando] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoLocacao>("15_dias");
  const adicionandoRef = useRef(false);
  
  const imagem = getKitImage(kit);
  const imagemUrl = resolveMediaUrl(imagem?.url);
  const totalItens = kit.itens.reduce((total, item) => total + item.quantidade, 0);
  const periodosDisponiveis: PeriodoLocacaoDisponivel[] = kit.periodos_disponiveis;
  const periodoAtual = useMemo(() => periodosDisponiveis.find((periodo) => periodo.tipo === periodoSelecionado) ?? periodosDisponiveis[0], [periodosDisponiveis, periodoSelecionado]);
  
  const hasPeriodOptions = periodosDisponiveis.length > 0;
  const periodoEfetivo = periodoAtual?.tipo;

  const handleAddToCart = async () => {
    if (!hasPeriodOptions || !periodoEfetivo || adicionandoRef.current) return;
    adicionandoRef.current = true;
    setAdicionando(true);
    try {
      await adicionarAoCarrinho({ tipo_item: "kit_festa", kit_festa_id: kit.id, quantidade: 1, periodo_locacao: periodoEfetivo });
      await refreshCart();
      openCart();
    } catch (err) {
      console.error("Erro ao adicionar kit festa:", err);
      alert(getCartErrorMessage(err));
    } finally {
      adicionandoRef.current = false;
      setAdicionando(false);
    }
  };

  return (
    <article className="group flex h-full min-h-[356px] w-full flex-col overflow-hidden rounded-3xl border border-[#FAB555]/35 bg-white shadow-sm shadow-[#803233]/5 transition duration-200 hover:-translate-y-0.5 hover:border-[#F07F40]/45 hover:shadow-lg hover:shadow-[#803233]/10">
      <Link href={`/kits/${kit.id}`} aria-label={`Ver detalhes de ${kit.nome}`} className="relative aspect-square overflow-hidden bg-[#FFF8EC]">
        {imagemUrl ? (
          <Image
            src={imagemUrl}
            alt={imagem?.alt_text || kit.nome}
            fill
            className="object-contain p-1 transition-transform duration-500 ease-out group-hover:scale-125"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center border-b border-dashed border-[#FAB555]/50 bg-white text-xs font-medium text-zinc-400">Sem imagem</div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="brand" className="normal-case tracking-normal bg-[#FFF4DF] text-[#803233]">Kit festa</Badge>
          <span className="text-xs font-semibold text-zinc-500">{totalItens} item{totalItens === 1 ? "" : "s"}</span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-base font-bold leading-5 text-[#2C1615] [font-family:var(--font-fredoka)]"><Link href={`/kits/${kit.id}`} className="hover:text-[#AB2E97]">{kit.nome}</Link></h3>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-500">{kit.descricao}</p>

        <div className="mt-auto pt-4">
          <Link
            href={`/kits/${kit.id}`}
            className="mb-2 inline-flex min-h-8 items-center text-xs font-bold text-[#803233] underline decoration-[#FAB555] decoration-2 underline-offset-4 transition-colors hover:text-[#AB2E97]"
          >
            Ver kit completo
          </Link>
          <p className="text-[11px] font-medium text-zinc-500">A partir de</p>
          <p className="text-xl font-black text-[#2C1615]">{periodoAtual ? formatPrice(periodoAtual.preco) : "Sob consulta"}</p>
          
          {hasPeriodOptions ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {periodosDisponiveis.map((option) => {
                const selected = periodoEfetivo === option.tipo;
                return (
                  <button
                    key={option.tipo}
                    type="button"
                    onClick={() => setPeriodoSelecionado(option.tipo)}
                    className={`inline-flex min-h-8 items-center justify-center rounded-full border px-3 text-[11px] font-bold leading-none transition-colors sm:h-7 sm:min-h-0 sm:px-2.5 ${selected ? "border-[#F07F40] bg-[#FFF1E8] text-[#803233]" : "border-zinc-200 bg-white text-zinc-600 hover:border-[#FAB555]"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-zinc-500">Indisponivel para locacao</p>
          )}

          {hasPeriodOptions && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adicionando}
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#AB2E97] px-4 text-sm font-semibold text-white shadow-sm shadow-[#AB2E97]/15 transition-colors hover:bg-[#803233] disabled:cursor-not-allowed disabled:opacity-70 sm:h-10"
            >
              {adicionando ? "Adicionando..." : "Adicionar ao carrinho"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const { isCartOpen } = useCart();
  const brinquedosCarouselRef = useRef<HTMLDivElement | null>(null);
  const kitsCarouselRef = useRef<HTMLDivElement | null>(null);
  
  const [brinquedos, setBrinquedos] = useState<BrinquedoCatalogo[]>([]);
  const [kitsFesta, setKitsFesta] = useState<KitFestaCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<CatalogoError>(initialErrors);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  
  const [brinquedoScrollState, setBrinquedoScrollState] = useState(initialCarouselScrollState);
  const [kitsScrollState, setKitsScrollState] = useState(initialCarouselScrollState);

  const loadCatalogo = async () => {
    setLoading(true); setErrors(initialErrors);
    const [brinquedosResult, kitsResult] = await Promise.allSettled([listarBrinquedos(), listarKitsFesta()]);

    if (brinquedosResult.status === "fulfilled") setBrinquedos(brinquedosResult.value);
    else { setBrinquedos([]); setErrors((current) => ({ ...current, brinquedos: "Erro" })); }

    if (kitsResult.status === "fulfilled") setKitsFesta(kitsResult.value);
    else { setKitsFesta([]); setErrors((current) => ({ ...current, kits: "Erro" })); }

    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    async function loadInitialCatalogo() {
      const [brinquedosResult, kitsResult] = await Promise.allSettled([listarBrinquedos(), listarKitsFesta()]);
      if (!active) return;
      if (brinquedosResult.status === "fulfilled") setBrinquedos(brinquedosResult.value);
      else { setBrinquedos([]); setErrors((c) => ({ ...c, brinquedos: "Erro" })); }
      
      if (kitsResult.status === "fulfilled") setKitsFesta(kitsResult.value);
      else { setKitsFesta([]); setErrors((c) => ({ ...c, kits: "Erro" })); }
      
      setLoading(false);
    }
    void loadInitialCatalogo();
    return () => { active = false; };
  }, []);

  const categorias = useMemo(() => {
    const categoriasPorSlug = new Map<string, string>();
    brinquedos.forEach((brinquedo) => {
      if (brinquedo.categoria && isVisibleCategoryFilter(brinquedo.categoria.nome, brinquedo.categoria.slug)) {
        categoriasPorSlug.set(brinquedo.categoria.slug, brinquedo.categoria.nome);
      }
    });
    return Array.from(categoriasPorSlug.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [brinquedos]);

  const normalizedSearch = normalizeText(searchQuery);

  const brinquedosFiltrados = useMemo(() => {
    return brinquedos.filter((brinquedo) => {
      const matchCategory = selectedCategory === "todos" || brinquedo.categoria?.slug === selectedCategory;
      const matchAvailability = !onlyAvailable || brinquedo.disponivel_para_carrinho === true;
      return matchCategory && matchAvailability && matchesSearch(brinquedo, normalizedSearch);
    }).sort((a, b) => b.id - a.id);
  }, [brinquedos, normalizedSearch, onlyAvailable, selectedCategory]);

  const kitsFestaFiltrados = useMemo(() => {
    return kitsFesta.filter((kit) => matchesKitSearch(kit, normalizedSearch)).sort((a, b) => b.id - a.id);
  }, [kitsFesta, normalizedSearch]);

  const totalItensFiltrados = brinquedosFiltrados.length + kitsFestaFiltrados.length;
  const hasCatalogError = Boolean(errors.brinquedos || errors.kits);
  const hasNoCatalogData = brinquedos.length === 0 && kitsFesta.length === 0;

  useEffect(() => {
    const carousel = brinquedosCarouselRef.current;
    if (!carousel) { setBrinquedoScrollState(initialCarouselScrollState); return; }
    const updateScrollState = () => setBrinquedoScrollState(readCarouselScrollState(brinquedosCarouselRef));
    updateScrollState();
    carousel.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => { carousel.removeEventListener("scroll", updateScrollState); window.removeEventListener("resize", updateScrollState); };
  }, [brinquedosFiltrados.length, loading]);

  useEffect(() => {
    const carousel = kitsCarouselRef.current;
    if (!carousel) { setKitsScrollState(initialCarouselScrollState); return; }
    const updateScrollState = () => setKitsScrollState(readCarouselScrollState(kitsCarouselRef));
    updateScrollState();
    carousel.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => { carousel.removeEventListener("scroll", updateScrollState); window.removeEventListener("resize", updateScrollState); };
  }, [kitsFestaFiltrados.length, loading]);

  return (
    <main className="min-h-screen overflow-x-clip bg-[#FFF9F7] text-[#2C1615]">
      <Header
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        cartDropdownEnabled={false}
      />
      <SubNavbar />

      <div className="relative overflow-x-clip bg-gradient-to-b from-[#FFF4DF] via-[#F1FBF9] to-[#FFF8EC]">
        <span className="pointer-events-none absolute -left-16 top-12 hidden h-48 w-48 rounded-full bg-[#FAB555]/25 sm:block" />
        <span className="pointer-events-none absolute right-[7%] top-28 hidden h-5 w-5 rounded-full bg-[#EA524B]/80 sm:block" />
        <span className="pointer-events-none absolute -right-14 top-[38%] hidden h-44 w-44 rotate-12 rounded-[3rem] bg-[#76CFC8]/18 sm:block" />
        <span className="pointer-events-none absolute bottom-28 left-[12%] hidden h-24 w-24 rounded-full bg-[#AB2E97]/8 sm:block" />

      {/* A MÁGICA ACONTECE AQUI: LAYOUT DE 3 COLUNAS */}
      <div className={`relative mx-auto flex max-w-[1600px] flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:grid lg:gap-6 ${isCartOpen ? "lg:grid-cols-[240px_minmax(0,1fr)_280px] xl:grid-cols-[260px_minmax(0,1fr)_340px]" : "lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]"}`}>
        
        {/* COLUNA 1: FILTROS (Importado do nosso novo componente) */}
        <SidebarFilters
          totalItensFiltrados={totalItensFiltrados}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categorias={categorias}
          onlyAvailable={onlyAvailable}
          setOnlyAvailable={setOnlyAvailable}
          loading={loading}
        />

        {/* COLUNA 2: PRODUTOS (Vitrine) */}
        <div className="min-w-0 space-y-7 sm:space-y-8">
          {loading ? (
            <><LoadingCarousel /><LoadingCarousel /></>
          ) : hasCatalogError && hasNoCatalogData ? (
            <Card padding="lg" className="items-center rounded-lg text-center">
              <h2 className="text-xl font-bold text-zinc-900">Nao foi possivel carregar o catalogo.</h2>
              <Button
                type="button"
                className="mt-6 !bg-[#F07F40] !text-[#2C1615] hover:!bg-[#DC6E32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AB2E97]"
                loading={loading}
                onClick={() => void loadCatalogo()}
              >
                Tentar novamente
              </Button>
            </Card>
          ) : (
            <>
              {/* SESSÃO BRINQUEDOS */}
              <section id="brinquedos" className="min-w-0 scroll-mt-28">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2" aria-hidden="true">
                      <span className="h-2 w-10 rounded-full bg-[#AB2E97]" />
                      <span className="h-2 w-4 rounded-full bg-[#76CFC8]" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#2C1615] [font-family:var(--font-fredoka)]">Brinquedos</h2>
                    <p className="mt-1 text-sm text-zinc-600">{brinquedosFiltrados.length} encontrados</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {errors.brinquedos && <Button type="button" size="sm" variant="outline" onClick={() => void loadCatalogo()}>Recarregar</Button>}
                  </div>
                </div>

                {brinquedosFiltrados.length === 0 ? (
                  <EmptyState title="Nenhum brinquedo encontrado." message="Ajuste a busca, categoria ou disponibilidade." />
                ) : (
                  <div className="relative overflow-hidden rounded-3xl">
                    <CarouselButton direction="left" visible={brinquedoScrollState.canScrollPrevious} onClick={() => scrollCarousel(brinquedosCarouselRef, -1)} ariaLabel="Ver brinquedos anteriores" />
                    <div ref={brinquedosCarouselRef} className="@container flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {brinquedosFiltrados.map((brinquedo) => {
                        const imagem = getBrinquedoImage(brinquedo);
                        return (
                          <div key={brinquedo.id} className="w-full shrink-0 snap-start @min-[480px]:w-[calc((100%-1rem)/2)] @min-[720px]:w-[calc((100%-2rem)/3)] @min-[980px]:w-[calc((100%-3rem)/4)]">
                            <ProductCard
                              id={brinquedo.id}
                              nome={brinquedo.nome}
                              descricao={brinquedo.descricao}
                              periodosDisponiveis={brinquedo.periodos_disponiveis}
                              categoriaNome={brinquedo.categoria?.nome}
                              disponivelParaCarrinho={brinquedo.disponivel_para_carrinho === true}
                              statusCatalogo={brinquedo.status_catalogo ?? "alugado"}
                              imagemUrl={resolveMediaUrl(imagem?.url)}
                              imagemAlt={imagem?.alt_text}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <CarouselButton direction="right" visible={brinquedoScrollState.canScrollNext} onClick={() => scrollCarousel(brinquedosCarouselRef, 1)} ariaLabel="Ver proximos brinquedos" />
                  </div>
                )}
              </section>

              {/* SESSÃO KITS */}
              <section id="kits-festa" className="relative min-w-0 scroll-mt-28 pt-2 before:pointer-events-none before:absolute before:-top-4 before:left-0 before:h-px before:w-36 before:bg-gradient-to-r before:from-[#FAB555]/60 before:to-transparent">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2" aria-hidden="true">
                      <span className="h-2 w-10 rounded-full bg-[#F07F40]" />
                      <span className="h-2 w-4 rounded-full bg-[#FAB555]" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#2C1615] [font-family:var(--font-fredoka)]">Kits Festa</h2>
                    <p className="mt-1 text-sm text-zinc-600">{kitsFestaFiltrados.length} encontrados</p>
                  </div>
                </div>

                {kitsFestaFiltrados.length === 0 ? (
                  <EmptyState title="Nenhum kit festa encontrado." message="Ajuste a busca para ver mais kits." />
                ) : (
                  <div className="relative overflow-hidden rounded-3xl">
                    <CarouselButton direction="left" visible={kitsScrollState.canScrollPrevious} onClick={() => scrollCarousel(kitsCarouselRef, -1)} ariaLabel="Ver kits anteriores" />
                    <div ref={kitsCarouselRef} className="@container flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {kitsFestaFiltrados.map((kit) => (
                        <div key={kit.id} className="w-full shrink-0 snap-start @min-[480px]:w-[calc((100%-1rem)/2)] @min-[720px]:w-[calc((100%-2rem)/3)] @min-[980px]:w-[calc((100%-3rem)/4)]">
                          <KitFestaCard kit={kit} />
                        </div>
                      ))}
                    </div>
                    <CarouselButton direction="right" visible={kitsScrollState.canScrollNext} onClick={() => scrollCarousel(kitsCarouselRef, 1)} ariaLabel="Ver proximos kits" />
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* COLUNA 3: CARRINHO */}
        {isCartOpen ? <SidebarCart /> : null}

      </div>
      </div>
      <Footer />
    </main>
  );
}
