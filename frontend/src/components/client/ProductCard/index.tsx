import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface ProductCardProps {
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
  nome,
  descricao,
  precoAluguel,
  categoriaNome,
  quantidadeDisponivel,
  imagemUrl,
  imagemAlt,
}: ProductCardProps) {
  const isAvailable = quantidadeDisponivel > 0;

  return (
    <Card
      padding="none"
      className="group relative h-full border-zinc-100 transition-shadow duration-200 hover:shadow-md"
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        {isAvailable ? (
          <Badge variant="success">Disponivel</Badge>
        ) : (
          <Badge variant="default">Indisponivel</Badge>
        )}
      </div>

      <div className="h-40 w-full overflow-hidden bg-zinc-50">
        {imagemUrl ? (
          <img
            src={imagemUrl}
            alt={imagemAlt || nome}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white text-xs font-medium text-zinc-400">
            Sem imagem
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t border-zinc-50 bg-white p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {categoriaNome && <Badge variant="brand">{categoriaNome}</Badge>}
        </div>

        <h3 className="mt-2 line-clamp-2 text-base font-bold text-zinc-900">
          {nome}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-zinc-500">
          {descricao}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-400">
              Aluguel
            </p>
            <p className="text-lg font-bold text-zinc-900">
              {formatPrice(precoAluguel)}
            </p>
          </div>
          <p className="text-right text-xs font-medium text-zinc-500">
            {quantidadeDisponivel} unidade
            {quantidadeDisponivel === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </Card>
  );
}
