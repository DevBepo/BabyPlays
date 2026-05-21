"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/TextArea";

export default function NovoBrinquedo() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const categoriasOptions = [
    { value: "1", label: "Montar & Construir" },
    { value: "2", label: "Educativos" },
    { value: "3", label: "Faz de Conta" },
    { value: "4", label: "Primeira Infancia" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log("Formulario mockado. Integracao com API fica para outro commit.");
    setTimeout(() => {
      setLoading(false);
      router.push("/admin/brinquedos");
    }, 1500);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Novo brinquedo</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Preencha apenas os campos suportados pelo cadastro atual de brinquedos.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4 pb-2 border-b border-zinc-100">
              Dados do brinquedo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="Nome *"
                  placeholder="Ex: Cadeira de Balanco Fisher Price"
                  required
                />
              </div>

              <Select
                label="Categoria"
                options={categoriasOptions}
              />

              <Input
                label="Preco de aluguel (R$) *"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4 pb-2 border-b border-zinc-100">
              Descricao
            </h2>
            <Textarea
              label="Descricao completa *"
              placeholder="Descreva as caracteristicas do brinquedo..."
              required
            />
          </div>

          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100">
            <Checkbox
              label="Ativo no catalogo"
              defaultChecked
            />
            <p className="text-xs text-zinc-500 mt-1 pl-8">
              Este campo controla a publicacao no catalogo, nao a disponibilidade fisica de estoque.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-100 mt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Guardar brinquedo
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
