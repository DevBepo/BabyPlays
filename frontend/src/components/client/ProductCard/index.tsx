"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { adicionarAoCarrinho } from "@/services/cart";

interface ProductCardProps {
  id: number; 
  nome: string;
  descricao: string;
  precoAluguel: string;
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

export function ProductCard({
  id,
  nome,
  descricao,
  precoAluguel,
  categoriaNome,
  quantidadeDisponivel,
  imagemUrl,
  imagemAlt,
}: ProductCardProps) {
  const router = useRouter();
  const [adicionando, setAdicionando] = useState(false);
  const isAvailable = quantidadeDisponivel > 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    // Evita que o clique no botão dispare o link do cartão (se houver algum dele)
    e.preventDefault(); 
    e.stopPropagation();

    if (!isAvailable) return;

    setAdicionando(true);
    try {
      await adicionarAoCarrinho({
        tipo_item: "brinquedo",
        brinquedo_id: id,
        quantidade: 1,
      });
      
      // Atualiza o Header para o Dropdown puxar os novos dados
      router.refresh(); 
    } catch (err) {
      console.error("Erro ao adicionar:", err);
      alert("Ocorreu um erro ao adicionar ao carrinho.");
    } finally {
      setAdicionando(false);
    }
  };

  return (
    <Card
      padding="none"
      className="group relative flex flex-col h-full border-zinc-100 transition-shadow duration-200 hover:shadow-md overflow-hidden"
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        {isAvailable ? (
          <Badge variant="success">Disponível</Badge>
        ) : (
          <Badge variant="default">Indisponível</Badge>
        )}
      </div>

      <div className="h-48 w-full overflow-hidden bg-zinc-50 shrink-0">
        {imagemUrl ? (
          <img
            src={imagemUrl}
            alt={imagemAlt || nome}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center border-b border-dashed border-zinc-200 bg-white text-xs font-medium text-zinc-400">
            Sem imagem
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {categoriaNome && <Badge variant="brand">{categoriaNome}</Badge>}
        </div>

        <h3 className="line-clamp-2 text-base font-bold text-zinc-900 leading-tight">
          {nome}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500 mb-4">
          {descricao}
        </p>

        {/* Zona de Preço e Botão empurrada para o fundo */}
        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                Aluguer
              </p>
              <p className="text-xl font-black text-teal-600">
                {formatPrice(precoAluguel)}
              </p>
            </div>
            <p className="text-right text-xs font-medium text-zinc-400">
              {quantidadeDisponivel} unid.
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!isAvailable || adicionando}
            className={`w-full py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              !isAvailable
                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 hover:bg-teal-600 text-white shadow-sm"
            }`}
          >
            {adicionando ? (
              <span className="flex items-center gap-2">
                <span className="block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                A adicionar...
              </span>
            ) : isAvailable ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/><path d="M12 10v4"/><path d="M10 12h4"/></svg>
                Adicionar
              </>
            ) : (
              "Esgotado"
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}