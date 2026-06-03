"use client";

import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { useCart } from "@/hooks/useCart";
import { adicionarAoCarrinho } from "@/services/cart";
import type { ApiError } from "@/types/api";
import type { PeriodoLocacao, PeriodoLocacaoDisponivel } from "@/types/catalogo";

interface ProductCardProps {
  id: number;
  nome: string;
  descricao: string;
  periodosDisponiveis: PeriodoLocacaoDisponivel[];
  categoriaNome?: string;
  quantidadeDisponivel: number;
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
  quantidadeDisponivel,
  imagemUrl,
  imagemAlt,
}: ProductCardProps) {
  const { openCart, refreshCart } = useCart();
  const [adicionando, setAdicionando] = useState(false);
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
  const hasStock = quantidadeDisponivel > 0;
  const isAvailable = hasStock && hasPeriodOptions;

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

  return (
    <article className="group relative flex h-full min-h-[356px] w-[260px] shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md sm:w-[272px]">
      <div className="absolute left-3 top-3 z-10">
        {isAvailable ? (
          <Badge variant="success" className="normal-case tracking-normal">
            Disponivel
          </Badge>
        ) : (
          <Badge variant="default" className="normal-case tracking-normal">
            Indisponivel
          </Badge>
        )}
      </div>

      <button
        type="button"
        aria-label={`Favoritar ${nome}`}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-500 shadow-sm transition-colors hover:border-[#FF5A5F] hover:text-[#FF5A5F]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 0 1 7.1-7.1l.4.4.4-.4a5 5 0 0 1 7.1 7.1Z" />
        </svg>
      </button>

      <div className="h-48 w-full overflow-hidden bg-zinc-50">
        {imagemUrl ? (
          <img
            src={imagemUrl}
            alt={imagemAlt || nome}
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center border-b border-dashed border-zinc-200 bg-white text-xs font-medium text-zinc-400">
            Sem imagem
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-zinc-900">
          {nome}
        </h3>

        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
          {categoriaNome || descricao}
        </p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-black leading-none text-zinc-950">
              {periodoAtual ? formatPrice(periodoAtual.preco) : "Sob consulta"}
            </p>
            <p className="mt-1 text-[11px] font-medium text-zinc-500">
              por periodo
            </p>
          </div>
          <p className="text-right text-[11px] font-medium leading-4 text-zinc-500">
            {quantidadeDisponivel} unid.
          </p>
        </div>

        <div className="mt-auto pt-3">
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
                    className={`inline-flex h-7 items-center justify-center rounded-full border px-2.5 text-[11px] font-bold leading-none transition-colors ${
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
            <p className="mb-2 text-xs font-semibold text-zinc-500">
              Indisponivel para locacao
            </p>
          )}

          {isAvailable ? (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adicionando}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#FF5A5F] px-4 text-sm font-bold text-white transition-colors hover:bg-[#e94d52] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {adicionando ? "Adicionando..." : "Adicionar ao carrinho"}
            </button>
          ) : (
            <p className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-100 px-4 text-sm font-bold text-zinc-400">
              {hasStock ? "Indisponivel para locacao" : "Esgotado"}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
