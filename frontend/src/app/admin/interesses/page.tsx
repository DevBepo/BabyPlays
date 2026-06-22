"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { atualizarInteresseAdmin, listarInteressesAdmin, type InteresseDisponibilidade } from "@/services/catalogo";

export default function InteressesAdminPage() {
  const [interesses, setInteresses] = useState<InteresseDisponibilidade[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    try {
      setInteresses(await listarInteressesAdmin());
      setErro(null);
    } catch {
      setErro("Nao foi possivel carregar a fila de interesses.");
    }
  }

  useEffect(() => {
    let active = true;
    void listarInteressesAdmin()
      .then((dados) => { if (active) setInteresses(dados); })
      .catch(() => { if (active) setErro("Nao foi possivel carregar a fila de interesses."); });
    return () => { active = false; };
  }, []);

  async function concluir(id: number, status: "contatado" | "cancelado") {
    await atualizarInteresseAdmin(id, status);
    await carregar();
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Avise-me</h1>
        <p className="mt-1 text-sm text-zinc-500">Fila manual de clientes aguardando brinquedos.</p>
      </div>
      {erro && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{erro}</div>}
      <Card padding="lg">
        <div className="flex flex-col divide-y divide-zinc-100">
          {interesses.length === 0 ? <p className="text-sm text-zinc-500">Nenhum interesse pendente.</p> : interesses.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-zinc-900">{item.brinquedo_nome}</strong>
                  {item.disponibilidade_destacada && <Badge variant="success">Disponivel agora</Badge>}
                </div>
                <p className="mt-1 text-sm text-zinc-600">{item.cliente_nome} · {item.cliente_telefone}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void concluir(item.id, "contatado")}>Marcar contato</Button>
                <Button size="sm" variant="outline" onClick={() => void concluir(item.id, "cancelado")}>Cancelar</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
