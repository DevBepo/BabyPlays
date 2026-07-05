"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { useCart } from "@/hooks/useCart";
import { adicionarAoCarrinho } from "@/services/cart";
import { criarInteresseDisponibilidade } from "@/services/catalogo";
import { useAuth } from "@/hooks/useAuth";
import type { ApiError } from "@/types/api";
import type { PeriodoLocacao, PeriodoLocacaoDisponivel } from "@/types/catalogo";

interface ProductCardProps {
  id: number;
  nome: string;
  descricao: string;
  periodosDisponiveis: PeriodoLocacaoDisponivel[];
  categoriaNome?: string;
  disponivelParaCarrinho: boolean;
  statusCatalogo: "disponivel" | "indisponivel" | "alugado";
  imagemUrl?: string | null;
  imagemAlt?: string;
}

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
  const apiError = error as Partial<ApiError> | null;

  if (apiError?.message) {
    return apiError.message;
  }

  return "Nao foi possivel adicionar ao carrinho. Tente novamente.";
}

export function ProductCard({
  id,
  nome,
  descricao,
  periodosDisponiveis,
  categoriaNome,
  disponivelParaCarrinho,
  statusCatalogo,
  imagemUrl,
  imagemAlt,
}: ProductCardProps) {
  const { openCart, refreshCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [adicionando, setAdicionando] = useState(false);
  const [registrandoInteresse, setRegistrandoInteresse] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] =
    useState<PeriodoLocacao>("15_dias");
  const adicionandoRef = useRef(false);
  const periodoAtual = useMemo(
    () =>
      periodosDisponiveis.find((periodo) => periodo.tipo === periodoSelecionado) ??
      periodosDisponiveis[0],
    [periodosDisponiveis, periodoSelecionado],
  );
  const hasPeriodOptions = periodosDisponiveis.length > 0;
  const periodoEfetivo = periodoAtual?.tipo;
  const isAvailable = disponivelParaCarrinho && hasPeriodOptions;
  const isManuallyUnavailable = statusCatalogo === "indisponivel";

  const handleAddToCart = async () => {
    if (!isAvailable || !periodoEfetivo || adicionandoRef.current) {
      return;
    }

    adicionandoRef.current = true;
    setAdicionando(true);
    try {
      await adicionarAoCarrinho({
        tipo_item: "brinquedo",
        brinquedo_id: id,
        quantidade: 1,
        periodo_locacao: periodoEfetivo,
      });

      await refreshCart();
      openCart();
    } catch (err) {
      console.error("Erro ao adicionar:", err);
      alert(getCartErrorMessage(err));
    } finally {
      adicionandoRef.current = false;
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

  return (
    <article className="group relative flex h-full min-h-[356px] w-full flex-col overflow-hidden rounded-3xl border border-[#AB2E97]/15 bg-white shadow-sm shadow-[#803233]/5 transition duration-200 hover:-translate-y-0.5 hover:border-[#AB2E97]/30 hover:shadow-lg hover:shadow-[#803233]/10">
      <div className="absolute left-3 top-3 z-10">
        {isAvailable ? (
          <Badge variant="success" className="normal-case tracking-normal bg-[#E8F8F6] text-[#2C1615]">
            Disponivel
          </Badge>
        ) : (
          <Badge variant="default" className="normal-case tracking-normal bg-[#FDECEB] text-[#803233]">
            Alugado
          </Badge>
        )}
      </div>

      <Link
        href={`/brinquedos/${id}`}
        aria-label={`Ver detalhes de ${nome}`}
        className="aspect-square w-full overflow-hidden bg-[#FFF8EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#AB2E97]"
      >
        {imagemUrl ? (
          <img
            src={imagemUrl}
            alt={imagemAlt || nome}
            className="h-full w-full object-contain p-1 transition-transform duration-500 ease-out group-hover:scale-125"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center border-b border-dashed border-[#FAB555]/50 bg-white text-xs font-medium text-zinc-400">
            Sem imagem
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-[#2C1615] [font-family:var(--font-fredoka)]">
          <Link href={`/brinquedos/${id}`} className="rounded-sm transition-colors hover:text-[#AB2E97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AB2E97]">
            {nome}
          </Link>
        </h3>

        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
          {categoriaNome || descricao}
        </p>

        <div className="mt-3 flex items-end gap-3">
          <div>
            <p className="text-lg font-black leading-none text-[#2C1615]">
              {periodoAtual ? formatPrice(periodoAtual.preco) : "Sob consulta"}
            </p>
            <p className="mt-1 text-[11px] font-medium text-zinc-500">
              por periodo
            </p>
          </div>
        </div>

        <div className="mt-auto pt-3">
          <Link
            href={`/brinquedos/${id}`}
            className="mb-2 inline-flex min-h-8 items-center text-xs font-bold text-[#803233] underline decoration-[#FAB555] decoration-2 underline-offset-4 transition-colors hover:text-[#AB2E97]"
          >
            Ver brinquedo
          </Link>

          {hasPeriodOptions ? (
            <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Periodo de locacao">
              {periodosDisponiveis.map((option) => {
                const selected = periodoEfetivo === option.tipo;

                return (
                  <button
                    key={option.tipo}
                    type="button"
                    onClick={() => setPeriodoSelecionado(option.tipo)}
                    aria-pressed={selected}
                    className={`inline-flex min-h-8 items-center justify-center rounded-full border px-3 text-[11px] font-bold leading-none transition-colors sm:h-7 sm:min-h-0 sm:px-2.5 ${
                      selected
                        ? "border-[#AB2E97] bg-[#F7EAF5] text-[#803233]"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-[#76CFC8]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mb-2 text-xs font-semibold text-zinc-500">
              Alugado
            </p>
          )}

          {isAvailable ? (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adicionando}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#AB2E97] px-4 text-sm font-semibold text-white shadow-sm shadow-[#AB2E97]/15 transition-colors hover:bg-[#803233] disabled:cursor-not-allowed disabled:opacity-70 sm:h-10"
            >
              {adicionando ? "Adicionando..." : "Adicionar ao carrinho"}
            </button>
          ) : isManuallyUnavailable ? (
            <button
              type="button"
              disabled
              className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 px-4 text-sm font-bold text-zinc-500 sm:h-10 [font-family:var(--font-fredoka)]"
            >
              Alugado
            </button>
          ) : (
            <button
              type="button"
              onClick={handleInteresse}
              disabled={registrandoInteresse}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#AB2E97]/25 bg-[#F7EAF5] px-4 text-sm font-bold text-[#AB2E97] transition-colors hover:bg-[#FFF4DF] disabled:opacity-60 sm:h-10 [font-family:var(--font-fredoka)]"
            >
              {registrandoInteresse ? "Registrando..." : "Avise-me quando disponivel"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
