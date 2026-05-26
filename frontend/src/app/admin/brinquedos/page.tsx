"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listarBrinquedos } from "@/services/catalogo";
import type { BrinquedoCatalogo } from "@/types/catalogo";

export default function ListaBrinquedosAdmin() {
  const router = useRouter();
  const [brinquedos, setBrinquedos] = useState<BrinquedoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarLista() {
      try {
        setLoading(false);
        // Aqui é chamado o serviço para puxar os dados reais do Django
        const dados = await listarBrinquedos();
        setBrinquedos(dados);
      } catch (err) {
        console.error("Erro ao listar brinquedos:", err);
        setErro("Não foi possível carregar a lista de brinquedos.");
      } finally {
        setLoading(false);
      }
    }

    carregarLista();
  }, []);

  return (
    <div className="w-full">
      {/* Cabeçalho da Tela */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Brinquedos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gerencie o catálogo de brinquedos disponíveis para aluguel.
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push("/admin/brinquedos/novo")}>
          + Novo Brinquedo
        </Button>
      </div>

      {erro && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
          {erro}
        </div>
      )}

      {/* Tabela de Listagem */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">Nome</th>
                <th className="py-4 px-6">Preço aluguel</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-400 animate-pulse">
                    Carregando catálogo de brinquedos...
                  </td>
                </tr>
              ) : brinquedos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-400">
                    Nenhum brinquedo cadastrado ainda.
                  </td>
                </tr>
              ) : (
                brinquedos.map((brinquedo) => (
                  <tr key={brinquedo.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-zinc-500">#{brinquedo.id}</td>
                    <td className="py-4 px-6 font-semibold text-zinc-900">{brinquedo.nome}</td>
                    <td className="py-4 px-6 text-teal-600 font-medium">
                      R$ {brinquedo.preco_aluguel}
                    </td>
                    <td className="py-4 px-6">
                      {/* Se o modelo do django não vier com 'ativo', eu setei para true como fallback */}
                      {brinquedo.ativo !== false ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link 
                        href={`/brinquedos/${brinquedo.id}`}
                        target="_blank"
                        className="text-zinc-400 hover:text-teal-600 text-xs font-medium underline transition-colors"
                      >
                        Ver na loja
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}