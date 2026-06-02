"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

const atalhos = [
  {
    titulo: "Brinquedos",
    descricao: "Liste brinquedos e cadastre novos itens com categoria real.",
    href: "/admin/brinquedos",
    acao: "Gerenciar brinquedos",
  },
  {
    titulo: "Categorias",
    descricao: "Crie categorias usadas no cadastro de brinquedos.",
    href: "/admin/categorias",
    acao: "Gerenciar categorias",
  },
  {
    titulo: "Kits Festa",
    descricao: "Cadastre kits festa basicos e acompanhe a listagem real.",
    href: "/admin/kits",
    acao: "Gerenciar kits",
  },
];

export default function CatalogoAdminPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Catalogo</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie as bases do catalogo administrativo da BabyPlays.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {atalhos.map((atalho) => (
          <section
            key={atalho.href}
            className="flex min-h-52 flex-col justify-between rounded-lg border border-zinc-200 bg-white p-5"
          >
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{atalho.titulo}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{atalho.descricao}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => router.push(atalho.href)}>
              {atalho.acao}
            </Button>
          </section>
        ))}
      </div>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        A composicao avancada de kits festa continua fora deste formulario enquanto nao houver
        escrita segura de itens no backend. O cadastro basico do kit ja pode ser feito em Kits Festa.
      </section>
    </div>
  );
}
