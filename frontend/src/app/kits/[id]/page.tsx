"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/client/Footer";
import { useCart } from "@/hooks/useCart";
import { adicionarAoCarrinho } from "@/services/cart";
import { listarKitsFesta } from "@/services/catalogo";
import { resolveMediaUrl } from "@/lib/media-url";
import type { KitFestaCatalogo, PeriodoLocacao } from "@/types/catalogo";

function formatPrice(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue)
    ? numberValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : value;
}

export default function KitFestaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { openCart, refreshCart } = useCart();
  const id = Number(params?.id);
  const [kit, setKit] = useState<KitFestaCatalogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoLocacao>("15_dias");
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => {
    async function carregar() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        const encontrado = (await listarKitsFesta()).find((item) => item.id === id);
        if (!encontrado) {
          setNotFound(true);
          return;
        }
        setKit(encontrado);
        if (encontrado.periodos_disponiveis[0]) {
          setPeriodoSelecionado(encontrado.periodos_disponiveis[0].tipo);
        }
      } finally {
        setLoading(false);
      }
    }
    void carregar();
  }, [id]);

  if (loading) {
    return <main className="min-h-screen bg-[#FFF8EC] p-8"><div className="mx-auto h-96 max-w-6xl animate-pulse rounded-3xl bg-white" /></main>;
  }

  if (notFound || !kit) {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-[#2C1615]">Kit Festa não encontrado</h1>
        <Button type="button" className="mt-6" onClick={() => router.push("/")}>Voltar ao catálogo</Button>
      </main>
    );
  }

  const periodoAtual = kit.periodos_disponiveis.find((item) => item.tipo === periodoSelecionado) ?? kit.periodos_disponiveis[0];
  const disponivel = kit.periodos_disponiveis.length > 0;
  const imagemUrl = resolveMediaUrl(kit.imagem_url);
  const totalItens = kit.itens.reduce((total, item) => total + item.quantidade, 0);

  async function adicionar() {
    if (!kit || !periodoAtual || adicionando) return;
    setAdicionando(true);
    try {
      await adicionarAoCarrinho({ tipo_item: "kit_festa", kit_festa_id: kit.id, quantidade: 1, periodo_locacao: periodoAtual.tipo });
      await refreshCart();
      openCart();
    } finally {
      setAdicionando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Button type="button" variant="ghost" onClick={() => router.back()} className="mb-6">← Voltar</Button>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:gap-12">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-[#FAB555]/30 bg-white p-4 shadow-sm sm:p-8">
            {imagemUrl ? <Image src={imagemUrl} alt={kit.nome} width={720} height={720} priority className="h-full w-full object-contain" /> : <div className="text-sm text-zinc-400">Sem imagem disponível</div>}
          </div>

          <div className="flex flex-col gap-6 lg:py-2">
            <div>
              <div className="mb-3 flex items-center gap-2"><Badge variant={disponivel ? "success" : "default"}>{disponivel ? "Disponível" : "Indisponível"}</Badge><Badge variant="brand">Kit Festa</Badge></div>
              <h1 className="text-3xl font-bold leading-tight text-[#2C1615] sm:text-4xl [font-family:var(--font-fredoka)]">{kit.nome}</h1>
              <p className="mt-2 text-sm font-medium text-zinc-500">{totalItens} item{totalItens === 1 ? "" : "s"} no kit</p>
            </div>

            <section className="border-y border-[#FAB555]/35 py-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#803233]">Sobre o kit</h2>
              <p className="mt-2 whitespace-pre-line text-base leading-7 text-zinc-700">{kit.descricao}</p>
            </section>

            <section className="rounded-2xl border border-[#FAB555]/30 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-[#2C1615]">O que compõe o kit</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {kit.itens.map((item) => (
                  <div key={item.id} className="rounded-xl bg-[#FFF8EC] px-3 py-2 text-sm text-zinc-700"><strong className="text-[#803233]">{item.quantidade}x</strong> {item.brinquedo.nome}</div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#AB2E97]/15 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-3 text-sm font-bold text-[#2C1615]">Escolha o período</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {kit.periodos_disponiveis.map((periodo) => {
                  const selected = periodo.tipo === periodoAtual?.tipo;
                  return <button key={periodo.tipo} type="button" onClick={() => setPeriodoSelecionado(periodo.tipo)} aria-pressed={selected} className={`flex min-h-16 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left ${selected ? "border-[#AB2E97] bg-[#F7EAF5] text-[#803233]" : "border-zinc-200 text-zinc-600 hover:border-[#76CFC8]"}`}><span className="text-xs font-semibold">{periodo.label}</span><span className="mt-1 text-sm font-black">{formatPrice(periodo.preco)}</span></button>;
                })}
              </div>
            </section>

            <button type="button" onClick={() => void adicionar()} disabled={!disponivel || adicionando} className="h-12 w-full rounded-xl bg-[#AB2E97] text-base font-bold text-white hover:bg-[#803233] disabled:cursor-not-allowed disabled:bg-zinc-300">{adicionando ? "Adicionando..." : disponivel ? "Adicionar kit ao carrinho" : "Indisponível"}</button>
            <Link href="/" className="text-center text-sm font-medium text-[#AB2E97] underline">Continuar explorando o catálogo</Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
