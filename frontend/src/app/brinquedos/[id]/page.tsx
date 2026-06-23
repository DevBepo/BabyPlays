"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { adicionarAoCarrinho } from "@/services/cart";
import { criarInteresseDisponibilidade, listarBrinquedos } from "@/services/catalogo";
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

  useEffect(() => {
    async function carregarBrinquedo() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const brinquedos = await listarBrinquedos();
        const encontrado = brinquedos.find((b) => b.id === id);

        if (!encontrado) {
          setNotFound(true);
        } else {
          setBrinquedo(encontrado);
          // Se houver períodos disponíveis, usar o primeiro; caso contrário, usar o padrão
          if (encontrado.periodos_disponiveis.length > 0) {
            const tipoPrimeiro = encontrado.periodos_disponiveis[0].tipo as PeriodoLocacao;
            setPeriodoSelecionado(tipoPrimeiro);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar brinquedo:", err);
        setErro("Nao foi possivel carregar o brinquedo.");
      } finally {
        setLoading(false);
      }
    }

    void carregarBrinquedo();
  }, [id]);

  const periodoAtual = brinquedo?.periodos_disponiveis.find(
    (p) => p.tipo === periodoSelecionado,
  ) ?? brinquedo?.periodos_disponiveis[0];

  const imagem =
    brinquedo?.imagem_principal ??
    brinquedo?.imagens.find((item) => item.url) ??
    null;
  const imagemUrl = resolveMediaUrl(imagem?.url);
  const hasPeriodOptions = (brinquedo?.periodos_disponiveis.length ?? 0) > 0;
  const hasStock = (brinquedo?.quantidade_disponivel ?? 0) > 0;
  const isAvailable = hasStock && hasPeriodOptions;

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
      <main className="min-h-screen bg-[#F8F9FA] px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-64 rounded-lg bg-zinc-200" />
            <div className="h-10 rounded bg-zinc-200" />
            <div className="h-6 rounded bg-zinc-200" />
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !brinquedo) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] px-4 py-8">
        <div className="mx-auto max-w-4xl text-center">
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
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          ← Voltar
        </Button>

        {erro && (
          <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          {/* Imagem */}
          <div className="flex items-center justify-center rounded-lg bg-white p-6 shadow-sm">
            {imagemUrl ? (
              <Image
                src={imagemUrl}
                alt={imagem?.alt_text || brinquedo.nome}
                width={400}
                height={400}
                className="max-h-96 w-full object-contain"
              />
            ) : (
              <div className="flex h-96 w-full items-center justify-center border-2 border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-400">
                Sem imagem disponivel
              </div>
            )}
          </div>

          {/* Detalhes */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-3 flex items-center gap-2">
                {isAvailable ? (
                  <Badge variant="success">Disponivel</Badge>
                ) : (
                  <Badge variant="default">Alugado</Badge>
                )}
                <span className="text-xs font-medium text-zinc-500">
                  {brinquedo.quantidade_disponivel} unidade{brinquedo.quantidade_disponivel === 1 ? "" : "s"}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-zinc-900">{brinquedo.nome}</h1>

              {brinquedo.categoria && (
                <p className="mt-2 text-sm text-zinc-600">
                  Categoria: <span className="font-medium">{brinquedo.categoria.nome}</span>
                </p>
              )}
            </div>

            <Card padding="lg">
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-zinc-700">
                  {brinquedo.descricao}
                </p>
              </div>
            </Card>

            <Card padding="lg">
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase text-zinc-500">
                    Selecione o periodo
                  </p>
                  {hasPeriodOptions ? (
                    <div className="flex flex-wrap gap-2">
                      {brinquedo.periodos_disponiveis.map((option) => {
                        const selected = periodoSelecionado === option.tipo;
                        return (
                          <button
                            key={option.tipo}
                            type="button"
                            onClick={() => setPeriodoSelecionado(option.tipo as PeriodoLocacao)}
                            aria-pressed={selected}
                            className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-bold transition-colors ${
                              selected
                                ? "border-teal-600 bg-teal-50 text-teal-800"
                                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                            }`}
                          >
                            {option.label}
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

                <div className="border-t border-zinc-100 pt-4">
                  <p className="text-xs font-medium text-zinc-500">Valor para este periodo</p>
                  <p className="mt-2 text-3xl font-bold text-zinc-900">
                    {periodoAtual ? formatPrice(periodoAtual.preco) : "Sob consulta"}
                  </p>
                </div>
              </div>
            </Card>

            {isAvailable ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={adicionando}
                className="h-12 w-full rounded-lg bg-[#FF5A5F] text-lg font-bold text-white transition-colors hover:bg-[#e94d52] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {adicionando ? "Adicionando ao carrinho..." : "Adicionar ao carrinho"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleInteresse}
                disabled={registrandoInteresse}
                className="h-12 w-full rounded-lg border border-violet-200 bg-violet-50 text-sm font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-60"
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
      <Footer />
    </main>
  );
}

export default function BrinquedoDetalhePage() {
  return <BrinquedoDetalheContent />;
}
