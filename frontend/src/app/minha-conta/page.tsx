"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/client/Header";
import { Footer } from "@/components/client/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { changePassword, updateMe } from "@/services/auth";
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

function getFieldMessage(error: unknown, field: string) {
  const apiError = error as Partial<ApiError> | null;
  return apiError?.fieldErrors?.[field]?.[0];
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#76CFC8]/70 bg-white/80 px-6 py-10 text-center shadow-sm shadow-[#803233]/5">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F8F6] text-[#AB2E97]" aria-hidden="true">
        <span className="h-3 w-3 rounded-full bg-current" />
      </div>
      <h3 className="text-lg font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#803233]/70">
        {message}
      </p>
    </div>
  );
}

function PedidoCard({ pedido }: { pedido: PedidoCliente }) {
  const totalItens = pedido.itens.reduce((total, item) => total + item.quantidade, 0);

  return (
    <article className="rounded-3xl border border-[#FAB555]/35 bg-white p-5 shadow-sm shadow-[#803233]/5 transition-shadow hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#AB2E97]">
            Pedido #{pedido.id}
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">
            {statusLabels[pedido.status] ?? pedido.status}
          </h3>
        </div>
        <span className="rounded-full bg-[#E8F8F6] px-3 py-1 text-xs font-bold text-[#2C6F6A]">
          {formatCurrency(pedido.total_estimado_snapshot)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-zinc-600 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold text-[#803233]/55">Evento</p>
          <p className="mt-1 font-medium text-zinc-800">
            {formatDate(pedido.data_evento_pretendida)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#803233]/55">Locação</p>
          <p className="mt-1 font-medium text-zinc-800">
            {formatDate(pedido.data_inicio_locacao)} a {formatDate(pedido.data_fim_locacao)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#803233]/55">Itens</p>
          <p className="mt-1 font-medium text-zinc-800">
            {totalItens} item{totalItens === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {pedido.itens.length > 0 ? (
        <div className="mt-5 divide-y divide-[#FAB555]/20 rounded-2xl border border-[#FAB555]/25 bg-[#FFF8EC]/60">
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
  const [saveError, setSaveError] = useState<unknown>(null);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoNovaSenha, setConfirmacaoNovaSenha] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<unknown>(null);
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);
  const [pedidosError, setPedidosError] = useState<string | null>(null);

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
        nome,
        telefone,
      });
      await refreshMe();
      setNomeDraft(null);
      setTelefoneDraft(null);
      setEmailDraft(null);
      setSaveMessage("Dados atualizados com sucesso.");
    } catch (error) {
      setSaveError(error);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage(null);
    setPasswordError(null);

    try {
      const response = await changePassword({
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
        confirmacao_nova_senha: confirmacaoNovaSenha,
      });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacaoNovaSenha("");
      setPasswordMessage(response.message);
    } catch (error) {
      setPasswordError(error);
    } finally {
      setPasswordSaving(false);
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#FFF4DF] via-[#F1FBF9] to-[#FFF8EC] px-6 py-16 text-[#2C1615]">
        <div className="mx-auto max-w-md rounded-3xl border border-[#AB2E97]/10 bg-white/90 p-8 text-center shadow-xl shadow-[#803233]/8">
          <div className="mx-auto mb-4 h-8 w-8 animate-pulse rounded-full bg-[#76CFC8]/50" aria-hidden="true" />
          <p className="font-semibold [font-family:var(--font-fredoka)]">Carregando sua conta...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#FFF9F7] text-[#2C1615]">
        <Header />

        <div className="relative overflow-hidden bg-gradient-to-b from-[#FFF4DF] via-[#F1FBF9] to-[#FFF8EC]">
          <span className="pointer-events-none absolute -left-16 top-8 hidden h-48 w-48 rounded-full bg-[#FAB555]/25 sm:block" />
          <span className="pointer-events-none absolute right-[7%] top-24 hidden h-5 w-5 rounded-full bg-[#EA524B]/75 sm:block" />
          <span className="pointer-events-none absolute -right-16 bottom-20 hidden h-52 w-52 rotate-12 rounded-[3rem] bg-[#76CFC8]/18 md:block" />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          <section className="overflow-hidden rounded-3xl border border-[#AB2E97]/12 bg-white/90 p-5 shadow-lg shadow-[#803233]/7 backdrop-blur-sm sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2" aria-hidden="true">
                  <span className="h-2 w-10 rounded-full bg-[#AB2E97]" />
                  <span className="h-2 w-4 rounded-full bg-[#76CFC8]" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#AB2E97]">
                  Seu espaço BabyPlays
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#2C1615] [font-family:var(--font-fredoka)] sm:text-4xl">
                  Minha conta
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#803233]/70 sm:text-base">
                  Olá, {cliente?.nome ?? user?.email}. Acompanhe suas informações e solicitações na BabyPlays.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[#AB2E97]/10 bg-[#F7EAF5]/60 p-1.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-11 rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AB2E97] ${
                      activeTab === tab.id
                        ? "bg-[#AB2E97] text-white shadow-sm shadow-[#AB2E97]/20"
                        : "text-[#803233] hover:bg-white hover:text-[#AB2E97]"
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
              <Card padding="lg" className="!rounded-3xl !border-[#AB2E97]/12 shadow-sm shadow-[#803233]/5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#AB2E97]">Dados pessoais</p>
                <h2 className="mt-1 text-xl font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">Seus dados cadastrais</h2>
                <p className="mt-2 text-sm leading-6 text-[#803233]/65">Mantenha suas informações atualizadas para facilitar nosso contato.</p>
                <form className="mt-6 grid gap-5 sm:grid-cols-2 [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border-[#803233]/20 [&_input]:focus:border-[#AB2E97] [&_input]:focus:ring-[#AB2E97] [&_label]:font-semibold [&_label]:text-[#2C1615]" onSubmit={handleSave}>
                  <div className="sm:col-span-2">
                    <Input
                      label="Nome"
                      value={nome}
                      onChange={(event) => setNomeDraft(event.target.value)}
                      error={getFieldMessage(saveError, "nome")}
                      required
                    />
                  </div>
                  <Input
                    label="Telefone"
                    value={telefone}
                    onChange={(event) => setTelefoneDraft(event.target.value)}
                    error={getFieldMessage(saveError, "telefone")}
                    required
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    error={getFieldMessage(saveError, "email")}
                    required
                  />

                  {saveError ? (
                    <p role="alert" className="rounded-2xl border border-[#EA524B]/30 bg-[#FDECEB] px-4 py-3 text-sm font-semibold text-[#803233] sm:col-span-2">
                      {getApiMessage(saveError, "Não foi possível atualizar seus dados agora.")}
                    </p>
                  ) : null}
                  {saveMessage ? (
                    <p role="status" className="rounded-2xl border border-[#76CFC8]/40 bg-[#E8F8F6] px-4 py-3 text-sm font-semibold text-[#2C6F6A] sm:col-span-2">
                      {saveMessage}
                    </p>
                  ) : null}

                  <div className="sm:col-span-2">
                    <Button type="submit" loading={saving} className="!min-h-11 !rounded-xl !bg-[#AB2E97] !text-white hover:!bg-[#803233] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AB2E97]">
                      Salvar alterações
                    </Button>
                  </div>
                </form>
              </Card>

              <Card padding="lg" className="!rounded-3xl !border-[#FAB555]/35 shadow-sm shadow-[#803233]/5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#F07F40]">Visão geral</p>
                <h2 className="mt-1 text-xl font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">Resumo da conta</h2>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#76CFC8]/25 bg-[#E8F8F6]/70 p-4">
                    <p className="text-xs font-semibold text-[#2C6F6A]">Pedidos e solicitações</p>
                    <p className="mt-1 text-3xl font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">{pedidos.length}</p>
                  </div>
                  <div className="rounded-2xl border border-[#FAB555]/25 bg-[#FFF4DF]/75 p-4">
                    <p className="text-xs font-semibold text-[#803233]/65">Último pedido</p>
                    <p className="mt-1 text-sm font-bold text-[#2C1615]">
                      {pedidosRecentes[0] ? `#${pedidosRecentes[0].id}` : "Nenhum ainda"}
                    </p>
                  </div>
                </div>
              </Card>

              <Card padding="lg" className="!rounded-3xl !border-[#AB2E97]/12 shadow-sm shadow-[#803233]/5 lg:col-span-2">
                <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#AB2E97]">Segurança</p>
                    <h2 className="mt-1 text-xl font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">Alterar senha</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#803233]/65">
                      Confirme sua senha atual antes de escolher uma nova.
                    </p>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-[#803233]/55 lg:mt-0">
                    Use uma senha longa e diferente das demais.
                  </p>
                </div>

                <form className="mt-6 grid gap-4 md:grid-cols-3 [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border-[#803233]/20 [&_input]:focus:border-[#AB2E97] [&_input]:focus:ring-[#AB2E97] [&_label]:font-semibold [&_label]:text-[#2C1615]" onSubmit={handlePasswordSave}>
                  <Input
                    label="Senha atual"
                    type="password"
                    autoComplete="current-password"
                    value={senhaAtual}
                    onChange={(event) => setSenhaAtual(event.target.value)}
                    error={getFieldMessage(passwordError, "senha_atual")}
                    required
                  />
                  <Input
                    label="Nova senha"
                    type="password"
                    autoComplete="new-password"
                    value={novaSenha}
                    onChange={(event) => setNovaSenha(event.target.value)}
                    error={getFieldMessage(passwordError, "nova_senha")}
                    required
                  />
                  <Input
                    label="Confirmar nova senha"
                    type="password"
                    autoComplete="new-password"
                    value={confirmacaoNovaSenha}
                    onChange={(event) => setConfirmacaoNovaSenha(event.target.value)}
                    error={getFieldMessage(passwordError, "confirmacao_nova_senha")}
                    required
                  />

                  {passwordError ? (
                    <p role="alert" className="rounded-2xl border border-[#EA524B]/30 bg-[#FDECEB] px-4 py-3 text-sm font-semibold text-[#803233] md:col-span-3">
                      {getApiMessage(passwordError, "Não foi possível alterar sua senha agora.")}
                    </p>
                  ) : null}
                  {passwordMessage ? (
                    <p role="status" className="rounded-2xl border border-[#76CFC8]/40 bg-[#E8F8F6] px-4 py-3 text-sm font-semibold text-[#2C6F6A] md:col-span-3">
                      {passwordMessage}
                    </p>
                  ) : null}

                  <div className="md:col-span-3">
                    <Button type="submit" loading={passwordSaving} className="!min-h-11 !rounded-xl !bg-[#AB2E97] !px-8 !text-white hover:!bg-[#803233]">
                      Alterar senha
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          ) : null}

          {activeTab === "pedidos" ? (
            <section className="space-y-5 rounded-3xl border border-[#AB2E97]/10 bg-white/55 p-4 shadow-sm shadow-[#803233]/5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#AB2E97]">Histórico</p>
                  <h2 className="mt-1 text-xl font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">Meus pedidos</h2>
                  <p className="mt-1 text-sm text-[#803233]/65">
                    {pedidos.length} pedido{pedidos.length === 1 ? "" : "s"} encontrado{pedidos.length === 1 ? "" : "s"}.
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#AB2E97]/20 bg-white px-4 text-sm font-bold text-[#AB2E97] transition-colors hover:border-[#AB2E97] hover:bg-[#F7EAF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AB2E97]"
                >
                  Ver catálogo
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
        </div>
        <Footer />
    </main>
  );
}
