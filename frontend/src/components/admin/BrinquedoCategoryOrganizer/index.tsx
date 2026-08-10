"use client";

import Image from "next/image";
import { useState, type DragEvent } from "react";

import { Button } from "@/components/ui/Button";
import { resolveMediaUrl } from "@/lib/media-url";
import type { BrinquedoCatalogo, CategoriaCatalogo } from "@/types/catalogo";

type CategoriaDestino = number | null;

type BrinquedoCategoryOrganizerProps = {
  brinquedos: BrinquedoCatalogo[];
  categorias: CategoriaCatalogo[];
  brinquedoMovendoId: number | null;
  onMove: (brinquedoId: number, categoriaId: CategoriaDestino) => Promise<void>;
  onCreateCategory: () => void;
};

function chaveCategoria(categoriaId: CategoriaDestino) {
  return categoriaId === null ? "sem-categoria" : String(categoriaId);
}

export function BrinquedoCategoryOrganizer({
  brinquedos,
  categorias,
  brinquedoMovendoId,
  onMove,
  onCreateCategory,
}: BrinquedoCategoryOrganizerProps) {
  const [brinquedoArrastandoId, setBrinquedoArrastandoId] = useState<number | null>(null);
  const [destinoAtivo, setDestinoAtivo] = useState<string | null>(null);

  const colunas = [
    { id: null, nome: "Sem categoria", ativo: true },
    ...categorias.map((categoria) => ({
      id: categoria.id,
      nome: categoria.nome,
      ativo: categoria.ativo !== false,
    })),
  ];

  function iniciarArraste(event: DragEvent<HTMLElement>, brinquedoId: number) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(brinquedoId));
    setBrinquedoArrastandoId(brinquedoId);
  }

  function finalizarArraste() {
    setBrinquedoArrastandoId(null);
    setDestinoAtivo(null);
  }

  function permitirSoltar(event: DragEvent<HTMLElement>, categoriaId: CategoriaDestino) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDestinoAtivo(chaveCategoria(categoriaId));
  }

  async function soltar(event: DragEvent<HTMLElement>, categoriaId: CategoriaDestino) {
    event.preventDefault();
    const brinquedoId = Number(
      event.dataTransfer.getData("text/plain") || brinquedoArrastandoId,
    );
    finalizarArraste();

    if (!Number.isInteger(brinquedoId)) {
      return;
    }

    await onMove(brinquedoId, categoriaId);
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Organizar por categoria</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Arraste cada brinquedo para a categoria desejada. A alteração é salva
            automaticamente. Para usar teclado ou celular, a categoria também pode ser
            alterada em Editar.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onCreateCategory}>
          Nova categoria
        </Button>
      </div>

      <div className="mt-5 overflow-x-auto pb-3">
        <div className="grid min-w-max auto-cols-[minmax(250px,290px)] grid-flow-col gap-4">
          {colunas.map((coluna) => {
            const itens = brinquedos
              .filter((brinquedo) => (brinquedo.categoria?.id ?? null) === coluna.id)
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
            const chave = chaveCategoria(coluna.id);
            const estaAtiva = destinoAtivo === chave;

            return (
              <div
                key={chave}
                onDragEnter={(event) => permitirSoltar(event, coluna.id)}
                onDragOver={(event) => permitirSoltar(event, coluna.id)}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setDestinoAtivo(null);
                  }
                }}
                onDrop={(event) => void soltar(event, coluna.id)}
                className={`flex min-h-72 flex-col rounded-2xl border p-3 transition-colors ${
                  estaAtiva
                    ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200"
                    : "border-zinc-200 bg-zinc-50/80"
                }`}
              >
                <div className="flex items-center justify-between gap-3 px-1 pb-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold uppercase tracking-wide text-zinc-800">
                      {coluna.nome}
                    </h3>
                    {!coluna.ativo ? (
                      <span className="text-xs font-medium text-amber-700">Categoria inativa</span>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 shadow-sm">
                    {itens.length}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  {itens.map((brinquedo) => {
                    const imagemUrl = resolveMediaUrl(brinquedo.imagem_principal?.url);
                    const estaMovendo = brinquedoMovendoId === brinquedo.id;
                    const estaArrastando = brinquedoArrastandoId === brinquedo.id;

                    return (
                      <article
                        key={brinquedo.id}
                        draggable={!brinquedoMovendoId}
                        onDragStart={(event) => iniciarArraste(event, brinquedo.id)}
                        onDragEnd={finalizarArraste}
                        className={`flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm transition ${
                          estaArrastando ? "scale-[0.98] opacity-40" : "hover:border-teal-300"
                        } ${
                          estaMovendo
                            ? "cursor-wait opacity-60"
                            : "cursor-grab active:cursor-grabbing"
                        }`}
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                          {imagemUrl ? (
                            <Image
                              src={imagemUrl}
                              alt=""
                              fill
                              className="object-contain p-1"
                              sizes="48px"
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center text-lg text-zinc-400" aria-hidden="true">
                              ◇
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-zinc-900">
                            {brinquedo.nome}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {estaMovendo ? "Salvando..." : "Arraste para mover"}
                          </p>
                        </div>
                        <span className="select-none text-lg leading-none text-zinc-400" aria-hidden="true">
                          ⠿
                        </span>
                      </article>
                    );
                  })}

                  {itens.length === 0 ? (
                    <div
                      className={`flex min-h-28 flex-1 items-center justify-center rounded-xl border border-dashed px-4 text-center text-xs leading-5 ${
                        estaAtiva
                          ? "border-teal-400 bg-white text-teal-700"
                          : "border-zinc-300 bg-white/60 text-zinc-400"
                      }`}
                    >
                      {estaAtiva ? "Solte o brinquedo aqui" : "Arraste brinquedos para esta coluna"}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
