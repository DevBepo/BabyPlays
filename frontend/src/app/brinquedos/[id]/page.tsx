"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { adicionarAoCarrinho } from "@/services/cart";
import { criarInteresseDisponibilidade, obterBrinquedo } from "@/services/catalogo";
import { resolveMediaUrl } from "@/lib/media-url";
import type { BrinquedoCatalogo, PeriodoLocacao } from "@/types/catalogo";
import Image from "next/image";
import { Footer } from "@/components/client/Footer";

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

function getCartErrorMessage(error: unknown) {
  const apiError = error as Partial<{ message?: string }> | null;
  if (apiError?.message) {
    return apiError.message;
  }
  return "Nao foi possivel adicionar ao carrinho. Tente novamente.";
}

function BrinquedoDetalheContent() {
  const params = useParams();
  const router = useRouter();
  const { openCart, refreshCart } = useCart();
  const { isAuthenticated } = useAuth();
  const id = Number(params?.id);

  const [brinquedo, setBrinquedo] = useState<BrinquedoCatalogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoLocacao>("15_dias");
  const [adicionando, setAdicionando] = useState(false);
  const [registrandoInteresse, setRegistrandoInteresse] = useState(false);
  const [imagemSelecionadaId, setImagemSelecionadaId] = useState<number | null>(null);

  useEffect(() => {
    async function carregarBrinquedo() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const encontrado = await obterBrinquedo(id);
        if (encontrado) {
          setBrinquedo(encontrado);
          setImagemSelecionadaId(encontrado.imagem_principal?.id ?? encontrado.imagens[0]?.id ?? null);
          // Se houver períodos disponíveis, usar o primeiro; caso contrário, usar o padrão
          if (encontrado.periodos_disponiveis.length > 0) {
            const tipoPrimeiro = encontrado.periodos_disponiveis[0].tipo as PeriodoLocacao;
            setPeriodoSelecionado(tipoPrimeiro);
          }
        }
      } catch (err) {
        const apiError = err as Partial<{ status?: number }>;
        if (apiError?.status === 404) {
          setNotFound(true);
        } else {
          console.error("Erro ao carregar brinquedo:", err);
          setErro("Nao foi possivel carregar o brinquedo.");
        }
      } finally {
        setLoading(false);
      }
    }

    void carregarBrinquedo();
  }, [id]);

  const periodoAtual = brinquedo?.periodos_disponiveis.find(
    (p) => p.tipo === periodoSelecionado,
  ) ?? brinquedo?.periodos_disponiveis[0];

  const imagens = Array.from(
    new Map(
      [brinquedo?.imagem_principal, ...(brinquedo?.imagens ?? [])]
        .filter((item): item is NonNullable<typeof item> => Boolean(item?.url))
        .map((item) => [item.id, item]),
    ).values(),
  );
  const imagem =
    imagens.find((item) => item.id === imagemSelecionadaId) ??
    brinquedo?.imagem_principal ??
    imagens[0] ??
    null;
  const imagemUrl = resolveMediaUrl(imagem?.url);
  const hasPeriodOptions = (brinquedo?.periodos_disponiveis.length ?? 0) > 0;
  const isAvailable = brinquedo?.disponivel_para_carrinho === true && hasPeriodOptions;
  const isManuallyUnavailable = brinquedo?.status_catalogo === "indisponivel";

  const navegarImagem = (direcao: -1 | 1) => {
    if (imagens.length < 2) return;
    const indiceAtual = Math.max(0, imagens.findIndex((item) => item.id === imagem?.id));
    const proximoIndice = (indiceAtual + direcao + imagens.length) % imagens.length;
    setImagemSelecionadaId(imagens[proximoIndice].id);
  };

  const handleAddToCart = async () => {
    if (!brinquedo || !isAvailable || !periodoSelecionado || adicionando) {
      return;
    }

    setAdicionando(true);
    try {
      await adicionarAoCarrinho({
        tipo_item: "brinquedo",
        brinquedo_id: brinquedo.id,
        quantidade: 1,
        periodo_locacao: periodoSelecionado,
      });

      await refreshCart();
      openCart();
    } catch (err) {
      console.error("Erro ao adicionar ao carrinho:", err);
      alert(getCartErrorMessage(err));
    } finally {
      setAdicionando(false);
    }
  };

  const handleInteresse = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/brinquedos/${id}`);
      return;
    }
    setRegistrandoInteresse(true);
    try {
      await criarInteresseDisponibilidade(id);
      alert("Interesse registrado. A BabyPlays entrara em contato pelo seu WhatsApp.");
    } catch (error) {
      alert(getCartErrorMessage(error));
    } finally {
      setRegistrandoInteresse(false);
    }
  };

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

  if (notFound || !brinquedo) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#FFF4DF] via-[#F1FBF9] to-[#FFF8EC] px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/80 bg-white/80 p-8 text-center shadow-lg shadow-[#803233]/5 backdrop-blur-sm">
          <h1 className="text-3xl font-bold text-zinc-900">Brinquedo nao encontrado</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Desculpe, o brinquedo que voce procura nao existe ou foi removido.
          </p>
          <Button type="button" className="mt-6" onClick={() => router.push("/")}>
            Voltar para o catalogo
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-gradient-to-b from-[#FFF4DF] via-[#F1FBF9] to-[#FFF8EC]">
      <main className="relative px-4 pb-20 pt-6 sm:pb-28 sm:pt-10">
      <span className="pointer-events-none absolute -left-20 top-28 h-52 w-52 rounded-full bg-[#FAB555]/20" />
      <span className="pointer-events-none absolute right-[6%] top-20 h-5 w-5 rounded-full bg-[#EA524B]/65" />
      <span className="pointer-events-none absolute -right-20 top-[42%] h-56 w-56 rotate-12 rounded-[4rem] bg-[#76CFC8]/15" />
      <span className="pointer-events-none absolute bottom-32 left-[12%] h-10 w-10 rotate-12 rounded-xl bg-[#AB2E97]/8" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 rounded-full bg-white/75 px-4 shadow-sm backdrop-blur-sm hover:bg-white"
        >
          ← Voltar
        </Button>

        {erro && (
          <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-8">
          <div>
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[2rem] border border-white/90 bg-white/90 p-4 shadow-xl shadow-[#803233]/8 backdrop-blur-sm sm:p-8">
              {imagemUrl ? (
                <Image
                  src={imagemUrl}
                  alt={imagem?.alt_text || brinquedo.nome}
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

            {imagens.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5" aria-label="Galeria de imagens">
                {imagens.map((item) => {
                  const itemUrl = resolveMediaUrl(item.url);
                  const selecionada = item.id === imagem?.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setImagemSelecionadaId(item.id)}
                      aria-label={`Ver imagem: ${item.alt_text || brinquedo.nome}`}
                      aria-pressed={selecionada}
                      className={`aspect-square overflow-hidden rounded-2xl border-2 bg-white/90 p-1.5 shadow-sm transition-all ${
                        selecionada ? "border-[#AB2E97] shadow-[#AB2E97]/15" : "border-white hover:border-[#76CFC8]"
                      }`}
                    >
                      {itemUrl && (
                        <Image
                          src={itemUrl}
                          alt={item.alt_text || brinquedo.nome}
                          width={144}
                          height={144}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detalhes */}
          <div className="flex flex-col gap-6 rounded-[2rem] border border-white/90 bg-white/85 p-5 shadow-xl shadow-[#803233]/8 backdrop-blur-sm sm:p-7 lg:p-8">
            <div>
              <div className="mb-3 flex items-center gap-2">
                {isAvailable ? (
                  <Badge variant="success">Disponivel</Badge>
                ) : (
                  <Badge variant="default">
                    Alugado
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl font-bold leading-tight text-[#2C1615] sm:text-4xl [font-family:var(--font-fredoka)]">{brinquedo.nome}</h1>

              {brinquedo.categoria && (
                <p className="mt-2 text-sm text-zinc-600">
                  Categoria: <span className="font-medium">{brinquedo.categoria.nome}</span>
                </p>
              )}
            </div>

            <section className="rounded-2xl bg-[#FFF8EC]/80 p-4 sm:p-5" aria-labelledby="descricao-brinquedo">
              <h2 id="descricao-brinquedo" className="text-sm font-bold uppercase tracking-wide text-[#803233]">Sobre o brinquedo</h2>
              <p className="mt-2 whitespace-pre-line text-base leading-7 text-zinc-700">{brinquedo.descricao}</p>
            </section>

            <section className="rounded-2xl border border-[#AB2E97]/12 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="periodos-brinquedo">
              <div className="space-y-4">
                <div>
                  <h2 id="periodos-brinquedo" className="mb-3 text-sm font-bold text-[#2C1615]">Escolha o período</h2>
                  {hasPeriodOptions ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {brinquedo.periodos_disponiveis.map((option) => {
                        const selected = periodoSelecionado === option.tipo;
                        return (
                          <button
                            key={option.tipo}
                            type="button"
                            onClick={() => setPeriodoSelecionado(option.tipo as PeriodoLocacao)}
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
                    <p className="text-sm font-medium text-zinc-500">
                      Alugado
                    </p>
                  )}
                </div>

                <div className="flex items-end justify-between gap-4 border-t border-zinc-100 pt-4">
                  <p className="text-xs font-medium text-zinc-500">Total do período selecionado</p>
                  <p className="text-2xl font-black text-[#2C1615]">
                    {periodoAtual ? formatPrice(periodoAtual.preco) : "Sob consulta"}
                  </p>
                </div>
              </div>
            </section>

            {isAvailable ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={adicionando}
                className="h-13 w-full rounded-2xl bg-[#AB2E97] text-base font-bold text-white shadow-lg shadow-[#AB2E97]/20 transition-all hover:-translate-y-0.5 hover:bg-[#803233] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {adicionando ? "Adicionando ao carrinho..." : "Adicionar ao carrinho"}
              </button>
            ) : isManuallyUnavailable ? (
              <button
                type="button"
                disabled
                className="h-13 w-full cursor-not-allowed rounded-2xl border border-zinc-200 bg-zinc-100 text-sm font-bold text-zinc-500"
              >
                Alugado
              </button>
            ) : (
              <button
                type="button"
                onClick={handleInteresse}
                disabled={registrandoInteresse}
                className="h-13 w-full rounded-2xl border border-violet-200 bg-violet-50 text-sm font-bold text-violet-700 shadow-sm hover:bg-violet-100 disabled:opacity-60"
              >
                {registrandoInteresse ? "Registrando..." : "Avise-me quando estiver disponivel"}
              </button>
            )}

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

export default function BrinquedoDetalhePage() {
  return <BrinquedoDetalheContent />;
}
