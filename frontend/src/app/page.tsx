"use client";

import Image from "next/image";
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
  ref.current?.scrollBy({ left: direction * 620, behavior: "smooth" });
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
        <div key={index} className="h-[356px] w-[280px] shrink-0 animate-pulse rounded-lg border border-zinc-200 bg-white sm:w-[288px]">
          <div className="h-48 bg-zinc-100" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-24 rounded bg-zinc-100" />
            <div className="h-5 w-3/4 rounded bg-zinc-100" />
            <div className="h-4 w-full rounded bg-zinc-100" />
            <div className="h-10 w-full rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card padding="lg" className="items-center rounded-lg text-center">
      <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">{message}</p>
    </Card>
  );
}

function CarouselButton({ direction, onClick, visible }: { direction: "left" | "right"; onClick: () => void; visible: boolean; }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md shadow-zinc-900/10 transition-colors hover:border-teal-600 hover:text-teal-700 sm:flex ${direction === "left" ? "left-2" : "right-2"}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {direction === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </button>
  );
}

function KitFestaCard({ kit }: { kit: KitFestaCatalogo }) {
  const { refreshCart } = useCart();
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
    } catch (err) {
      console.error("Erro ao adicionar kit festa:", err);
      alert(getCartErrorMessage(err));
    } finally {
      adicionandoRef.current = false;
      setAdicionando(false);
    }
  };

  return (
    <article className="flex h-full min-h-[356px] w-[280px] shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md sm:w-[288px]">
      <div className="relative h-44 overflow-hidden bg-zinc-50">
        {imagemUrl ? (
          <Image src={imagemUrl} alt={imagem?.alt_text || kit.nome} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center border-b border-dashed border-zinc-200 bg-white text-xs font-medium text-zinc-400">Sem imagem</div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="brand" className="normal-case tracking-normal">Kit festa</Badge>
          <span className="text-xs font-semibold text-zinc-500">{totalItens} item{totalItens === 1 ? "" : "s"}</span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-base font-black leading-5 text-zinc-950">{kit.nome}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-500">{kit.descricao}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600">
          {kit.itens.slice(0, 2).map((item) => (
            <span key={item.id} className="line-clamp-1 rounded-md bg-zinc-50 px-2.5 py-2 font-medium">
              {item.quantidade}x {item.brinquedo.nome}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-4">
          <p className="text-[11px] font-medium text-zinc-500">A partir de</p>
          <p className="text-xl font-black text-zinc-950">{periodoAtual ? formatPrice(periodoAtual.preco) : "Sob consulta"}</p>
          
          {hasPeriodOptions ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {periodosDisponiveis.map((option) => {
                const selected = periodoEfetivo === option.tipo;
                return (
                  <button
                    key={option.tipo}
                    type="button"
                    onClick={() => setPeriodoSelecionado(option.tipo)}
                    className={`inline-flex h-7 items-center justify-center rounded-full border px-2.5 text-[11px] font-bold leading-none transition-colors ${selected ? "border-teal-600 bg-teal-50 text-teal-800" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"}`}
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
              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md bg-[#FF5A5F] px-4 text-sm font-bold text-white transition-colors hover:bg-[#e94d52] disabled:cursor-not-allowed disabled:opacity-70"
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
  const brinquedosCarouselRef = useRef<HTMLDivElement | null>(null);
  const kitsCarouselRef = useRef<HTMLDivElement | null>(null);
  
  const [brinquedos, setBrinquedos] = useState<BrinquedoCatalogo[]>([]);
  const [kitsFesta, setKitsFesta] = useState<KitFestaCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<CatalogoError>(initialErrors);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  
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
      const matchAvailability = !onlyAvailable || brinquedo.quantidade_disponivel > 0;
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
    <main className="min-h-screen bg-[#F8F9FA] text-zinc-950">
      <Header
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        cartDropdownEnabled={false}
      />
      <SubNavbar />

      {/* A MÁGICA ACONTECE AQUI: LAYOUT DE 3 COLUNAS */}
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)_280px] lg:gap-6 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        
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
        <div className="min-w-0 space-y-7">
          {loading ? (
            <><LoadingCarousel /><LoadingCarousel /></>
          ) : hasCatalogError && hasNoCatalogData ? (
            <Card padding="lg" className="items-center rounded-lg text-center">
              <h2 className="text-xl font-bold text-zinc-900">Nao foi possivel carregar o catalogo.</h2>
              <Button type="button" className="mt-6" loading={loading} onClick={() => void loadCatalogo()}>Tentar novamente</Button>
            </Card>
          ) : (
            <>
              {/* SESSÃO BRINQUEDOS */}
              <section id="brinquedos" className="min-w-0">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-zinc-950">Brinquedos</h2>
                    <p className="mt-1 text-sm text-zinc-500">{brinquedosFiltrados.length} encontrados</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {errors.brinquedos && <Button type="button" size="sm" variant="outline" onClick={() => void loadCatalogo()}>Recarregar</Button>}
                  </div>
                </div>

                {brinquedosFiltrados.length === 0 ? (
                  <EmptyState title="Nenhum brinquedo encontrado." message="Ajuste a busca, categoria ou disponibilidade." />
                ) : (
                  <div className="relative">
                    <CarouselButton direction="left" visible={brinquedoScrollState.canScrollPrevious} onClick={() => scrollCarousel(brinquedosCarouselRef, -1)} />
                    <div ref={brinquedosCarouselRef} className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {brinquedosFiltrados.map((brinquedo) => {
                        const imagem = getBrinquedoImage(brinquedo);
                        return (
                          <div key={brinquedo.id} className="snap-start">
                            <ProductCard
                              id={brinquedo.id}
                              nome={brinquedo.nome}
                              descricao={brinquedo.descricao}
                              periodosDisponiveis={brinquedo.periodos_disponiveis}
                              categoriaNome={brinquedo.categoria?.nome}
                              quantidadeDisponivel={brinquedo.quantidade_disponivel}
                              imagemUrl={resolveMediaUrl(imagem?.url)}
                              imagemAlt={imagem?.alt_text}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <CarouselButton direction="right" visible={brinquedoScrollState.canScrollNext} onClick={() => scrollCarousel(brinquedosCarouselRef, 1)} />
                  </div>
                )}
              </section>

              {/* SESSÃO KITS */}
              <section id="kits-festa" className="min-w-0 border-t border-zinc-200 pt-5">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-zinc-950">Kits Festa</h2>
                    <p className="mt-1 text-sm text-zinc-500">{kitsFestaFiltrados.length} encontrados</p>
                  </div>
                </div>

                {kitsFestaFiltrados.length === 0 ? (
                  <EmptyState title="Nenhum kit festa encontrado." message="Ajuste a busca para ver mais kits." />
                ) : (
                  <div className="relative">
                    <CarouselButton direction="left" visible={kitsScrollState.canScrollPrevious} onClick={() => scrollCarousel(kitsCarouselRef, -1)} />
                    <div ref={kitsCarouselRef} className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {kitsFestaFiltrados.map((kit) => (
                        <div key={kit.id} className="snap-start">
                          <KitFestaCard kit={kit} />
                        </div>
                      ))}
                    </div>
                    <CarouselButton direction="right" visible={kitsScrollState.canScrollNext} onClick={() => scrollCarousel(kitsCarouselRef, 1)} />
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* COLUNA 3: CARRINHO */}
        <SidebarCart />

      </div>
      <Footer />
    </main>
  );
}
