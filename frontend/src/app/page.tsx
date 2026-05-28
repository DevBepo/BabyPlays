"use client";

import { useEffect, useMemo, useState } from "react";

import { Header } from "@/components/client/Header";
import { ProductCard } from "@/components/client/ProductCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { listarBrinquedos, listarKitsFesta } from "@/services/catalogo";
import type { BrinquedoCatalogo, KitFestaCatalogo } from "@/types/catalogo";

type CatalogoError = {
  brinquedos: string | null;
  kits: string | null;
};

const initialErrors: CatalogoError = {
  brinquedos: null,
  kits: null,
};

const HOME_PREVIEW_LIMIT = 4;

function formatPrice(value: string) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return numberValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesSearch(brinquedo: BrinquedoCatalogo, search: string) {
  if (!search) {
    return true;
  }

  const searchable = [
    brinquedo.nome,
    brinquedo.descricao,
    brinquedo.categoria?.nome ?? "",
  ]
    .map(normalizeText)
    .join(" ");

  return searchable.includes(search);
}

function getBrinquedoImage(brinquedo: BrinquedoCatalogo) {
  if (brinquedo.imagem_principal?.url) {
    return brinquedo.imagem_principal;
  }

  return brinquedo.imagens.find((imagem) => imagem.url);
}

function getKitImage(kit: KitFestaCatalogo) {
  return kit.itens.find((item) => item.brinquedo.imagem_principal?.url)
    ?.brinquedo.imagem_principal;
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: HOME_PREVIEW_LIMIT }).map((_, index) => (
        <div
          key={index}
          className="h-[280px] animate-pulse rounded-xl border border-zinc-100 bg-white"
        >
          <div className="h-40 bg-zinc-100" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-24 rounded bg-zinc-100" />
            <div className="h-5 w-3/4 rounded bg-zinc-100" />
            <div className="h-4 w-full rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card padding="lg" className="items-center text-center">
      <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">{message}</p>
    </Card>
  );
}

function KitFestaCard({ kit }: { kit: KitFestaCatalogo }) {
  const imagem = getKitImage(kit);
  const totalItens = kit.itens.reduce((total, item) => total + item.quantidade, 0);

  return (
    <Card padding="none" className="h-full border-zinc-100">
      <div className="h-40 overflow-hidden bg-zinc-50">
        {imagem?.url ? (
          <img
            src={imagem.url}
            alt={imagem.alt_text || kit.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white text-xs font-medium text-zinc-400">
            Sem imagem
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">Kit festa</Badge>
          <Badge variant="default">
            {totalItens} item{totalItens === 1 ? "" : "s"}
          </Badge>
        </div>

        <h3 className="mt-2 line-clamp-2 text-base font-bold text-zinc-900">
          {kit.nome}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-zinc-500">
          {kit.descricao}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {kit.itens.slice(0, 2).map((item) => (
            <span
              key={item.id}
              className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600"
            >
              {item.quantidade}x {item.brinquedo.nome}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-3">
          <p className="text-xs font-medium uppercase text-zinc-400">Aluguel</p>
          <p className="text-lg font-bold text-zinc-900">
            {formatPrice(kit.preco_aluguel)}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function Home() {
  const [brinquedos, setBrinquedos] = useState<BrinquedoCatalogo[]>([]);
  const [kitsFesta, setKitsFesta] = useState<KitFestaCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<CatalogoError>(initialErrors);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");

  const loadCatalogo = async () => {
    await Promise.resolve();

    setLoading(true);
    setErrors(initialErrors);

    const [brinquedosResult, kitsResult] = await Promise.allSettled([
      listarBrinquedos(),
      listarKitsFesta(),
    ]);

    if (brinquedosResult.status === "fulfilled") {
      setBrinquedos(brinquedosResult.value);
    } else {
      setBrinquedos([]);
      setErrors((current) => ({
        ...current,
        brinquedos: "Nao foi possivel carregar os brinquedos agora.",
      }));
    }

    if (kitsResult.status === "fulfilled") {
      setKitsFesta(kitsResult.value);
    } else {
      setKitsFesta([]);
      setErrors((current) => ({
        ...current,
        kits: "Nao foi possivel carregar os kits festa agora.",
      }));
    }

    setLoading(false);
  };

  useEffect(() => {
    let active = true;

    async function loadInitialCatalogo() {
      const [brinquedosResult, kitsResult] = await Promise.allSettled([
        listarBrinquedos(),
        listarKitsFesta(),
      ]);

      if (!active) {
        return;
      }

      if (brinquedosResult.status === "fulfilled") {
        setBrinquedos(brinquedosResult.value);
      } else {
        setBrinquedos([]);
        setErrors((current) => ({
          ...current,
          brinquedos: "Nao foi possivel carregar os brinquedos agora.",
        }));
      }

      if (kitsResult.status === "fulfilled") {
        setKitsFesta(kitsResult.value);
      } else {
        setKitsFesta([]);
        setErrors((current) => ({
          ...current,
          kits: "Nao foi possivel carregar os kits festa agora.",
        }));
      }

      setLoading(false);
    }

    void loadInitialCatalogo();

    return () => {
      active = false;
    };
  }, []);

  const categorias = useMemo(() => {
    const categoriasPorSlug = new Map<string, string>();

    brinquedos.forEach((brinquedo) => {
      if (brinquedo.categoria) {
        categoriasPorSlug.set(
          brinquedo.categoria.slug,
          brinquedo.categoria.nome,
        );
      }
    });

    return Array.from(categoriasPorSlug.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "pt-BR"),
    );
  }, [brinquedos]);

  const normalizedSearch = normalizeText(searchQuery);

  const brinquedosFiltrados = useMemo(() => {
    return brinquedos.filter((brinquedo) => {
      const matchCategory =
        selectedCategory === "todos" ||
        brinquedo.categoria?.slug === selectedCategory;

      return matchCategory && matchesSearch(brinquedo, normalizedSearch);
    });
  }, [brinquedos, normalizedSearch, selectedCategory]);

  const brinquedosPreview = useMemo(
    () => brinquedosFiltrados.slice(0, HOME_PREVIEW_LIMIT),
    [brinquedosFiltrados],
  );
  const kitsFestaPreview = useMemo(
    () => kitsFesta.slice(0, HOME_PREVIEW_LIMIT),
    [kitsFesta],
  );
  const hasMoreBrinquedos = brinquedosFiltrados.length > HOME_PREVIEW_LIMIT;
  const hasMoreKits = kitsFesta.length > HOME_PREVIEW_LIMIT;
  const hasCatalogError = Boolean(errors.brinquedos || errors.kits);
  const hasNoCatalogData = brinquedos.length === 0 && kitsFesta.length === 0;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <Header searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <section className="border-b border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-lg font-black tracking-tight text-zinc-950">
            Alugue brinquedos por periodo
          </h1>

          <div>
            {categorias.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedCategory === "todos" ? "secondary" : "outline"}
                  onClick={() => setSelectedCategory("todos")}
                >
                  Todas
                </Button>
                {categorias.map(([slug, nome]) => (
                  <Button
                    key={slug}
                    type="button"
                    size="sm"
                    variant={selectedCategory === slug ? "secondary" : "outline"}
                    onClick={() => setSelectedCategory(slug)}
                  >
                    {nome}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1600px] space-y-5 px-6 py-5">
        {loading ? (
          <LoadingGrid />
        ) : hasCatalogError && hasNoCatalogData ? (
          <Card padding="lg" className="items-center text-center">
            <h2 className="text-xl font-bold text-zinc-900">
              Nao foi possivel carregar o catalogo.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Tente novamente em instantes. Se o problema continuar, confira se
              a API esta disponivel.
            </p>
            <Button
              type="button"
              className="mt-6"
              loading={loading}
              onClick={() => void loadCatalogo()}
            >
              Tentar novamente
            </Button>
          </Card>
        ) : (
          <>
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-zinc-950">
                    Brinquedos
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Mostrando {brinquedosPreview.length} de{" "}
                    {brinquedosFiltrados.length} resultado
                    {brinquedosFiltrados.length === 1 ? "" : "s"}
                  </p>
                </div>

                {errors.brinquedos ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void loadCatalogo()}
                  >
                    Recarregar
                  </Button>
                ) : (
                  hasMoreBrinquedos && (
                    <Button type="button" size="sm" variant="ghost">
                      Ver todos
                    </Button>
                  )
                )}
              </div>

              {errors.brinquedos ? (
                <EmptyState
                  title="Nao foi possivel carregar os brinquedos."
                  message="A listagem de kits pode continuar disponivel, mas os brinquedos precisam ser recarregados."
                />
              ) : brinquedos.length === 0 ? (
                <EmptyState
                  title="Nenhum brinquedo cadastrado."
                  message="Quando houver brinquedos ativos no backend, eles aparecem aqui automaticamente."
                />
              ) : brinquedosFiltrados.length === 0 ? (
                <EmptyState
                  title="Nenhum brinquedo encontrado."
                  message="Ajuste a busca ou escolha outra categoria para ver mais itens do catalogo."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {brinquedosPreview.map((brinquedo) => {
                    const imagem = getBrinquedoImage(brinquedo);

                    return (
                      <ProductCard
                        key={brinquedo.id}
                        id={brinquedo.id}
                        nome={brinquedo.nome}
                        descricao={brinquedo.descricao}
                        precoAluguel={brinquedo.preco_aluguel}
                        categoriaNome={brinquedo.categoria?.nome}
                        quantidadeDisponivel={brinquedo.quantidade_disponivel}
                        imagemUrl={imagem?.url}
                        imagemAlt={imagem?.alt_text}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-zinc-950">
                    Kits festa
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Composicoes prontas com brinquedos cadastrados no catalogo.
                  </p>
                </div>

                {errors.kits ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void loadCatalogo()}
                  >
                    Recarregar
                  </Button>
                ) : (
                  hasMoreKits && (
                    <Button type="button" size="sm" variant="ghost">
                      Ver todos
                    </Button>
                  )
                )}
              </div>

              {errors.kits ? (
                <EmptyState
                  title="Nao foi possivel carregar os kits festa."
                  message="Os brinquedos continuam disponiveis acima enquanto a secao de kits e recarregada."
                />
              ) : kitsFesta.length === 0 ? (
                <EmptyState
                  title="Nenhum kit festa cadastrado."
                  message="Quando houver kits ativos no backend, eles aparecem nesta secao."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {kitsFestaPreview.map((kit) => (
                    <KitFestaCard key={kit.id} kit={kit} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
