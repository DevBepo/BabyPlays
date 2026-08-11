"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/client/Footer";
import { Header } from "@/components/client/Header";
import { SubNavbar } from "@/components/client/SubNavBar";
import { useCart } from "@/hooks/useCart";
import { adicionarAoCarrinho } from "@/services/cart";
import { obterKitFesta } from "@/services/catalogo";
import { resolveMediaUrl } from "@/lib/media-url";
import type { KitFestaCatalogo, PeriodoLocacao } from "@/types/catalogo";

function formatPrice(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue)
    ? numberValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : value;
}

function getCartErrorMessage(error: unknown) {
  const apiError = error as Partial<{ message?: string }> | null;
  if (apiError?.message) {
    return apiError.message;
  }
  return "Nao foi possivel adicionar ao carrinho. Tente novamente.";
}

export default function KitFestaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { openCart, refreshCart } = useCart();
  const id = Number(params?.id);

  const [kit, setKit] = useState<KitFestaCatalogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoLocacao>("15_dias");
  const [adicionando, setAdicionando] = useState(false);
  const [imagemSelecionadaId, setImagemSelecionadaId] = useState<number | null>(null);

  useEffect(() => {
    async function carregar() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const encontrado = await obterKitFesta(id);
        setKit(encontrado);
        setImagemSelecionadaId(
          encontrado.imagem_principal?.id ?? encontrado.imagens[0]?.id ?? null,
        );
        if (encontrado.periodos_disponiveis[0]) {
          setPeriodoSelecionado(encontrado.periodos_disponiveis[0].tipo);
        }
      } catch (error) {
        const apiError = error as Partial<{ status?: number }>;
        if (apiError?.status === 404) {
          setNotFound(true);
        } else {
          setErro("Nao foi possivel carregar o kit festa.");
        }
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#FFF4DF] via-[#F1FBF9] to-[#FFF8EC] px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-lg shadow-[#803233]/5 backdrop-blur-sm sm:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-64 rounded-3xl bg-white" />
            <div className="h-10 rounded-xl bg-white" />
            <div className="h-6 rounded-xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !kit) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#FFF4DF] via-[#F1FBF9] to-[#FFF8EC] px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/80 bg-white/80 p-8 text-center shadow-lg shadow-[#803233]/5 backdrop-blur-sm">
          <h1 className="text-3xl font-bold text-zinc-900">Kit festa nao encontrado</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Desculpe, o kit que voce procura nao existe ou foi removido.
          </p>
          <Button type="button" className="mt-6" onClick={() => router.push("/")}>
            Voltar para o catalogo
          </Button>
        </div>
      </main>
    );
  }

  const periodoAtual =
    kit.periodos_disponiveis.find((item) => item.tipo === periodoSelecionado) ??
    kit.periodos_disponiveis[0];
  const imagens = Array.from(
    new Map(
      [kit.imagem_principal, ...(kit.imagens ?? [])]
        .filter((item): item is NonNullable<typeof item> => Boolean(item?.url))
        .map((item) => [item.id, item]),
    ).values(),
  );
  const imagem =
    imagens.find((item) => item.id === imagemSelecionadaId) ??
    kit.imagem_principal ??
    imagens[0] ??
    null;
  const imagemUrl = resolveMediaUrl(imagem?.url ?? kit.imagem_url);
  const hasPeriodOptions = kit.periodos_disponiveis.length > 0;
  const disponivel = hasPeriodOptions;
  const totalItens = kit.itens.reduce((total, item) => total + item.quantidade, 0);

  const navegarImagem = (direcao: -1 | 1) => {
    if (imagens.length < 2) return;
    const indiceAtual = Math.max(0, imagens.findIndex((item) => item.id === imagem?.id));
    const proximoIndice = (indiceAtual + direcao + imagens.length) % imagens.length;
    setImagemSelecionadaId(imagens[proximoIndice].id);
  };

  async function adicionar() {
    if (!kit || !periodoAtual || adicionando || !disponivel) return;
    setAdicionando(true);
    try {
      await adicionarAoCarrinho({
        tipo_item: "kit_festa",
        kit_festa_id: kit.id,
        quantidade: 1,
        periodo_locacao: periodoAtual.tipo,
      });
      await refreshCart();
      openCart();
    } catch (error) {
      alert(getCartErrorMessage(error));
    } finally {
      setAdicionando(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-gradient-to-b from-[#FFF4DF] via-[#F1FBF9] to-[#FFF8EC]">
      <Header />
      <SubNavbar />
      <main className="relative px-3 pb-16 pt-4 sm:px-6 sm:pb-24 sm:pt-8">
        <span className="pointer-events-none absolute -left-20 top-28 hidden h-52 w-52 rounded-full bg-[#FAB555]/20 sm:block" />
        <span className="pointer-events-none absolute right-[6%] top-20 hidden h-5 w-5 rounded-full bg-[#EA524B]/65 sm:block" />
        <span className="pointer-events-none absolute -right-20 top-[42%] hidden h-56 w-56 rotate-12 rounded-[4rem] bg-[#76CFC8]/15 md:block" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 rounded-full bg-white/75 px-4 shadow-sm backdrop-blur-sm hover:bg-white"
          >
            ← Voltar
          </Button>

          {erro ? (
            <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {erro}
            </div>
          ) : null}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-8">
            <div>
              <div className="relative flex aspect-[4/3] max-h-[480px] w-full items-center justify-center overflow-hidden rounded-3xl border border-white/90 bg-white/90 p-3 shadow-xl shadow-[#803233]/8 backdrop-blur-sm sm:aspect-square sm:max-h-none sm:rounded-[2rem] sm:p-8">
                {imagemUrl ? (
                  <Image
                    src={imagemUrl}
                    alt={imagem?.alt_text || kit.nome}
                    width={720}
                    height={720}
                    className="h-full w-full object-contain"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-3xl border-2 border-dashed border-[#FAB555]/50 bg-[#FFF8EC] text-sm font-medium text-zinc-400">
                    Sem imagem disponivel
                  </div>
                )}
                {imagens.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navegarImagem(-1)}
                      aria-label="Imagem anterior"
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-white/90 text-2xl font-bold text-[#803233] shadow-md transition hover:bg-white"
                    >
                      &#8249;
                    </button>
                    <button
                      type="button"
                      onClick={() => navegarImagem(1)}
                      aria-label="Proxima imagem"
                      className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-white/90 text-2xl font-bold text-[#803233] shadow-md transition hover:bg-white"
                    >
                      &#8250;
                    </button>
                  </>
                ) : null}
              </div>

              {imagens.length > 1 ? (
                <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5" aria-label="Galeria de imagens">
                  {imagens.map((item) => {
                    const itemUrl = resolveMediaUrl(item.url);
                    const selecionada = item.id === imagem?.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setImagemSelecionadaId(item.id)}
                        aria-label={`Ver imagem: ${item.alt_text || kit.nome}`}
                        aria-pressed={selecionada}
                        className={`aspect-square overflow-hidden rounded-2xl border-2 bg-white/90 p-1.5 shadow-sm transition-all ${
                          selecionada ? "border-[#AB2E97] shadow-[#AB2E97]/15" : "border-white hover:border-[#76CFC8]"
                        }`}
                      >
                        {itemUrl ? (
                          <Image
                            src={itemUrl}
                            alt={item.alt_text || kit.nome}
                            width={144}
                            height={144}
                            className="h-full w-full object-contain"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-5 rounded-3xl border border-white/90 bg-white/85 p-4 shadow-xl shadow-[#803233]/8 backdrop-blur-sm sm:gap-6 sm:rounded-[2rem] sm:p-7 lg:p-8">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant={disponivel ? "success" : "default"}>
                    {disponivel ? "Disponivel" : "Indisponivel"}
                  </Badge>
                  <Badge variant="brand">Kit Festa</Badge>
                </div>
                <h1 className="break-words text-2xl font-bold leading-tight text-[#2C1615] sm:text-4xl [font-family:var(--font-fredoka)]">
                  {kit.nome}
                </h1>
                <p className="mt-2 text-sm font-medium text-zinc-500">
                  {totalItens} item{totalItens === 1 ? "" : "s"} no kit
                </p>
              </div>

              <section className="rounded-2xl bg-[#FFF8EC]/80 p-4 sm:p-5" aria-labelledby="descricao-kit">
                <h2 id="descricao-kit" className="text-sm font-bold uppercase tracking-wide text-[#803233]">
                  Sobre o kit
                </h2>
                <p className="mt-2 whitespace-pre-line text-base leading-7 text-zinc-700">
                  {kit.descricao}
                </p>
              </section>

              <section className="rounded-2xl border border-[#FAB555]/30 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="itens-kit">
                <h2 id="itens-kit" className="text-sm font-bold text-[#2C1615]">
                  O que compoe o kit
                </h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {kit.itens.length ? (
                    kit.itens.map((item) => (
                      <div key={item.id} className="rounded-xl bg-[#FFF8EC] px-3 py-2 text-sm text-zinc-700">
                        <strong className="text-[#803233]">{item.quantidade}x</strong>{" "}
                        {item.brinquedo.nome}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">Composicao ainda nao cadastrada.</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-[#AB2E97]/12 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="periodos-kit">
                <div className="space-y-4">
                  <div>
                    <h2 id="periodos-kit" className="mb-3 text-sm font-bold text-[#2C1615]">
                      Escolha o periodo
                    </h2>
                    {hasPeriodOptions ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {kit.periodos_disponiveis.map((option) => {
                          const selected = periodoSelecionado === option.tipo;
                          return (
                            <button
                              key={option.tipo}
                              type="button"
                              onClick={() => setPeriodoSelecionado(option.tipo)}
                              aria-pressed={selected}
                              className={`flex min-h-16 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors ${
                                selected
                                  ? "border-[#AB2E97] bg-[#F7EAF5] text-[#803233] shadow-sm"
                                  : "border-[#FAB555]/25 bg-[#FFFCF7] text-zinc-600 hover:border-[#76CFC8]"
                              }`}
                            >
                              <span className="text-xs font-semibold">{option.label}</span>
                              <span className="mt-1 text-sm font-black">{formatPrice(option.preco)}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-zinc-500">Indisponivel</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 border-t border-zinc-100 pt-4 min-[360px]:flex-row min-[360px]:items-end min-[360px]:justify-between min-[360px]:gap-4">
                    <p className="text-xs font-medium text-zinc-500">Total do periodo selecionado</p>
                    <p className="text-2xl font-black text-[#2C1615]">
                      {periodoAtual ? formatPrice(periodoAtual.preco) : "Sob consulta"}
                    </p>
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={() => void adicionar()}
                disabled={!disponivel || adicionando}
                className="h-13 w-full rounded-2xl bg-[#AB2E97] text-base font-bold text-white shadow-lg shadow-[#AB2E97]/20 transition-all hover:-translate-y-0.5 hover:bg-[#803233] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {adicionando ? "Adicionando ao carrinho..." : disponivel ? "Adicionar kit ao carrinho" : "Indisponivel"}
              </button>

              <Link
                href="/"
                className="text-center text-sm font-medium text-teal-600 underline hover:text-teal-700"
              >
                Continuar explorando o catalogo
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
