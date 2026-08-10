"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { PedidoManualForm } from "@/components/admin/PedidoManualForm";
import { obterAdminPedido } from "@/services/adminPedidos";
import type { AdminPedidoDetail } from "@/types/adminPedidos";

export default function EditarPedidoPage() {
  const params = useParams();
  const [pedido, setPedido] = useState<AdminPedidoDetail | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    obterAdminPedido(String(params.id))
      .then(setPedido)
      .catch(() => setErro("Não foi possível carregar o pedido."));
  }, [params.id]);

  if (erro) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{erro}</div>;
  if (!pedido) return <p className="text-sm text-zinc-500">Carregando pedido...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Editar pedido #{pedido.id}</h1>
        <p className="mt-1 text-sm text-zinc-500">Complete ou ajuste as informações do pedido.</p>
      </div>
      <PedidoManualForm pedido={pedido} />
    </div>
  );
}
