"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function CategoriasEmConstrucaoPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Card padding="lg" className="max-w-md w-full flex flex-col items-center text-center gap-4 border-dashed border-2 border-amber-200">
        
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 text-3xl shadow-sm mb-2">
          🚧
        </div>
        
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Página em Construção</h1>
          <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
            O modelo de Categorias já existe no banco de dados, mas o endpoint da API (<code className="bg-zinc-100 text-zinc-700 px-1 rounded">/api/categorias/</code>) ainda precisa ser criado no backend.
          </p>
        </div>

        <Button 
          variant="secondary" 
          onClick={() => router.back()} 
          className="w-full mt-4"
        >
          ← Voltar para a página anterior
        </Button>
        
      </Card>
    </div>
  );
}