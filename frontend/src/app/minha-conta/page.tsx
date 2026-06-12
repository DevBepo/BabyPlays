"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/client/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { updateMe } from "@/services/auth";
import { listarMeusPedidos } from "@/services/pedidos";
import type { ApiError } from "@/types/api";
import type { PedidoCliente } from "@/types/pedidos";

type AccountTab = "dados" | "pedidos";

const tabs: { id: AccountTab; label: string }[] = [
  { id: "dados", label: "Dados" },
  { id: "pedidos", label: "Pedidos" },
];

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  AGUARDANDO_CONTRATO: "Aguardando contrato",
  AGUARDANDO_CONFIRMACAO: "Aguardando confirmacao",
  CONFIRMADO: "Confirmado",
  EM_SEPARACAO: "Em separacao",
  SAIU_ENTREGA: "Saiu para entrega",
  EM_LOCACAO: "Em locacao",
  RETIRADO: "Retirado",
  CANCELADO: "Cancelado",
};

function formatCurrency(value: string) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return numberValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR");
}

function getApiMessage(error: unknown, fallback: string) {
  const apiError = error as Partial<ApiError> | null;
  return apiError?.message || fallback;
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-6 py-10 text-center">
      <h3 className="text-base font-bold text-zinc-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {message}
      </p>
    </div>
  );
}

function PedidoCard({ pedido }: { pedido: PedidoCliente }) {
  const totalItens = pedido.itens.reduce((total, item) => total + item.quantidade, 0);

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Pedido #{pedido.id}
          </p>
          <h3 className="mt-1 text-base font-black text-zinc-900">
            {statusLabels[pedido.status] ?? pedido.status}
          </h3>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
          {formatCurrency(pedido.total_estimado_snapshot)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-zinc-600 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold text-zinc-400">Evento</p>
          <p className="mt-1 font-medium text-zinc-800">
            {formatDate(pedido.data_evento_pretendida)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-400">Locacao</p>
          <p className="mt-1 font-medium text-zinc-800">
            {formatDate(pedido.data_inicio_locacao)} a {formatDate(pedido.data_fim_locacao)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-400">Itens</p>
          <p className="mt-1 font-medium text-zinc-800">
            {totalItens} item{totalItens === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {pedido.itens.length > 0 ? (
        <div className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-100">
          {pedido.itens.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="line-clamp-1 text-sm font-medium text-zinc-700">
                {item.nome_snapshot}
              </span>
              <span className="shrink-0 text-xs font-semibold text-zinc-500">
                {item.quantidade}x
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function MinhaContaPage() {
  const router = useRouter();
  const { cliente, user, isAuthenticated, loading: authLoading, refreshMe } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountTab>("dados");
  const [nomeDraft, setNomeDraft] = useState<string | null>(null);
  const [telefoneDraft, setTelefoneDraft] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);
  const [pedidosError, setPedidosError] = useState<string | null>(null);

  const hasCliente = Boolean(cliente);
  const pedidosRecentes = useMemo(() => pedidos.slice(0, 3), [pedidos]);
  const nome = nomeDraft ?? cliente?.nome ?? "";
  const telefone = telefoneDraft ?? cliente?.telefone ?? "";
  const email = emailDraft ?? user?.email ?? "";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?next=/minha-conta");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;

    async function carregarPedidos() {
      setPedidosLoading(true);
      setPedidosError(null);

      try {
        const data = await listarMeusPedidos();

        if (active) {
          setPedidos(data);
        }
      } catch (error) {
        if (active) {
          setPedidos([]);
          setPedidosError(getApiMessage(error, "Nao foi possivel carregar seus pedidos agora."));
        }
      } finally {
        if (active) {
          setPedidosLoading(false);
        }
      }
    }

    void carregarPedidos();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      await updateMe({
        email,
        ...(hasCliente ? { nome, telefone } : {}),
      });
      await refreshMe();
      setNomeDraft(null);
      setTelefoneDraft(null);
      setEmailDraft(null);
      setSaveMessage("Dados atualizados com sucesso.");
    } catch (error) {
      setSaveError(getApiMessage(error, "Nao foi possivel atualizar seus dados agora."));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] px-6 py-16 text-zinc-900">
        <div className="mx-auto max-w-md rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-zinc-600">Carregando sua conta...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-zinc-950">
        <Header />

        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  Minha conta
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">
                  {cliente?.nome ?? user?.email}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                  Acompanhe suas reservas e confira seus dados cadastrais.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-10 rounded-md px-3 text-xs font-bold transition-colors sm:text-sm ${
                      activeTab === tab.id
                        ? "bg-white text-teal-700 shadow-sm"
                        : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {activeTab === "dados" ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card padding="lg" className="rounded-lg">
                <h2 className="text-lg font-black text-zinc-900">Dados cadastrais</h2>
                <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={handleSave}>
                  <div className="sm:col-span-2">
                    <Input
                      label="Nome"
                      value={nome}
                      onChange={(event) => setNomeDraft(event.target.value)}
                      disabled={!hasCliente}
                      required={hasCliente}
                    />
                  </div>
                  <Input
                    label="Telefone"
                    value={telefone}
                    onChange={(event) => setTelefoneDraft(event.target.value)}
                    disabled={!hasCliente}
                    required={hasCliente}
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    required
                  />

                  {saveError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:col-span-2">
                      {saveError}
                    </p>
                  ) : null}
                  {saveMessage ? (
                    <p className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 sm:col-span-2">
                      {saveMessage}
                    </p>
                  ) : null}

                  <div className="sm:col-span-2">
                    <Button type="submit" loading={saving}>
                      Salvar alteracoes
                    </Button>
                  </div>
                </form>
              </Card>

              <Card padding="lg" className="rounded-lg">
                <h2 className="text-lg font-black text-zinc-900">Resumo</h2>
                <div className="mt-5 space-y-4">
                  <div className="rounded-lg bg-zinc-50 p-4">
                    <p className="text-xs font-semibold text-zinc-500">Pedidos</p>
                    <p className="mt-1 text-2xl font-black text-zinc-950">{pedidos.length}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-4">
                    <p className="text-xs font-semibold text-zinc-500">Ultimo pedido</p>
                    <p className="mt-1 text-sm font-bold text-zinc-800">
                      {pedidosRecentes[0] ? `#${pedidosRecentes[0].id}` : "Nenhum ainda"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          {activeTab === "pedidos" ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-zinc-900">Meus pedidos</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {pedidos.length} pedido{pedidos.length === 1 ? "" : "s"} encontrado{pedidos.length === 1 ? "" : "s"}.
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition-colors hover:border-teal-200 hover:text-teal-700"
                >
                  Ver catalogo
                </Link>
              </div>

              {pedidosLoading ? (
                <EmptyPanel title="Carregando pedidos" message="Estamos buscando seu historico de reservas." />
              ) : pedidosError ? (
                <EmptyPanel title="Nao foi possivel carregar" message={pedidosError} />
              ) : pedidos.length === 0 ? (
                <EmptyPanel
                  title="Nenhum pedido ainda"
                  message="Quando voce concluir uma reserva, ela aparece aqui com status, datas e itens."
                />
              ) : (
                <div className="grid gap-4">
                  {pedidos.map((pedido) => (
                    <PedidoCard key={pedido.id} pedido={pedido} />
                  ))}
                </div>
              )}
            </section>
          ) : null}

        </div>
    </main>
  );
}
