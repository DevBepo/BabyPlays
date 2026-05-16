import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// Tipagem das propriedades
interface ProductCardProps {
  title: string;
  imageSrc: string;
  ageRange: string;
  price: number;
  periodDays: number;
  isAvailable: boolean;
  estimatedDelivery: string;
  onSelectPeriod?: () => void;
}

// Ícone de coração (Favoritos)
const IconHeart = () => (
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
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

// Ícone de Calendário
const IconCalendar = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

export function ProductCard({
  title,
  imageSrc,
  ageRange,
  price,
  periodDays,
  isAvailable,
  estimatedDelivery,
  onSelectPeriod,
}: ProductCardProps) {
  // Função auxiliar para formatar para R$ real
  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <Card
      padding="none"
      className="group relative w-full max-w-sm border-zinc-100 hover:shadow-md transition-shadow duration-200"
    >
      {/* Área Superior: Badge e Favoritos */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-center z-10">
        {isAvailable ? (
          <Badge variant="success">Disponível</Badge>
        ) : (
          <Badge variant="default">Indisponível</Badge>
        )}
        <button
          type="button"
          aria-label="Adicionar aos favoritos"
          className="p-2 bg-white rounded-full text-zinc-400 hover:text-[#FF5A5F] shadow-sm border border-zinc-100 transition-colors"
        >
          <IconHeart />
        </button>
      </div>
      {/*Imagem do produto*/}
      <div className="aspect-square w-full p-8 flex items-center justify-center bg-white">
        <img
          src={imageSrc}
          alt={title}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      {/*Informações e detalhes*/}
      <div className="p-5 flex flex-col flex-1 bg-white border-t border-zinc-50">
        <h3 className="font-bold text-zinc-900 text-base line-clamp-1">
          {title}
        </h3>

        <p className="text-xs font-medium text-zinc-400 mt-1">
          {ageRange}
        </p>

        {/*Preço*/}
        <div className="mt-4 flex items-baseline gap-1 text-zinc-900">
          <span className="text-xl font-bold">{formatPrice(price)}</span>
          <span className="text-xs text-zinc-400 font-medium">/ {periodDays} dias</span>
        </div>

        {/* Botão de Ação "Selecionar período" */}
        <button
          type="button"
          onClick={onSelectPeriod}
          className="mt-4 flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors py-1 w-fit"
        >
          <IconCalendar />
          <span>Selecionar período</span>
        </button>

        {/* Prazo de Entrega Estimado */}
        <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-500 flex items-center gap-1">
          <span>Entrega estimada:</span>
          <span className="font-semibold text-zinc-700">{estimatedDelivery}</span>
        </div>

      </div>
    </Card>
  );
}
