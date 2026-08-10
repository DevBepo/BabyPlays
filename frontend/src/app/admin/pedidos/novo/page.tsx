import { PedidoManualForm } from "@/components/admin/PedidoManualForm";

export default function NovoPedidoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Novo pedido</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cadastre um pedido recebido por WhatsApp. Todos os campos são opcionais.
        </p>
      </div>
      <PedidoManualForm />
    </div>
  );
}
