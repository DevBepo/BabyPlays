"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/Select";
import { obterAgendaAdmin } from "@/services/adminAgenda";
import type { ApiError } from "@/types/api";
import type {
  AdminAgendaEvent,
  AdminAgendaEventType,
  AdminAgendaResponse,
  AdminAgendaTypeFilter,
} from "@/types/adminAgenda";

const eventTypeOptions: Array<{ value: AdminAgendaTypeFilter; label: string }> = [
  { value: "todos", label: "Todos os tipos" },
  { value: "entrega", label: "Entrega" },
  { value: "retirada", label: "Retirada" },
  { value: "contrato_pendente", label: "Contrato pendente" },
  { value: "locacao_em_andamento", label: "Locacao em andamento" },
];

const eventTypeStyles: Record<
  AdminAgendaEventType,
  {
    card: string;
    dot: string;
    summary: string;
    text: string;
  }
> = {
  entrega: {
    card: "border-cyan-200 bg-cyan-50 hover:border-cyan-300 hover:bg-cyan-100",
    dot: "bg-cyan-500",
    summary: "border-cyan-200 bg-cyan-50",
    text: "text-cyan-800",
  },
  retirada: {
    card: "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100",
    dot: "bg-emerald-500",
    summary: "border-emerald-200 bg-emerald-50",
    text: "text-emerald-800",
  },
  contrato_pendente: {
    card: "border-rose-200 bg-rose-50 hover:border-rose-300 hover:bg-rose-100",
    dot: "bg-rose-500",
    summary: "border-rose-200 bg-rose-50",
    text: "text-rose-800",
  },
  locacao_em_andamento: {
    card: "border-indigo-200 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100",
    dot: "bg-indigo-500",
    summary: "border-indigo-200 bg-indigo-50",
    text: "text-indigo-800",
  },
};

const statusLabels: Record<string, string> = {
  aguardando_analise: "Aguardando analise",
  reservado: "Reservado",
  confirmado: "Confirmado",
  em_locacao: "Em locacao",
  retirado: "Retirado",
  cancelado: "Cancelado",
};

const eventTypeLabels: Record<AdminAgendaEventType, string> = {
  entrega: "Entregas",
  retirada: "Retiradas",
  contrato_pendente: "Contratos pendentes",
  locacao_em_andamento: "Locacoes em andamento",
};

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

function getAgendaErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 401) {
      return "Voce precisa estar autenticado para acessar a agenda administrativa.";
    }

    if (error.status === 403) {
      return "Seu usuario nao tem permissao de admin/staff para acessar esta agenda.";
    }

    return error.message;
  }

  return "Nao foi possivel carregar a agenda administrativa agora.";
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = normalizeDate(date);
  nextDate.setDate(nextDate.getDate() + days);
  return normalizeDate(nextDate);
}

function getWeekStart(date: Date) {
  const normalizedDate = normalizeDate(date);
  const dayOfWeek = normalizedDate.getDay();
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return addDays(normalizedDate, offset);
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatDayName(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function getEventsByDay(
  events: AdminAgendaEvent[] | undefined,
  weekDays: Date[],
) {
  const eventsByDay = weekDays.reduce<Record<string, AdminAgendaEvent[]>>(
    (acc, date) => {
      acc[formatApiDate(date)] = [];
      return acc;
    },
    {},
  );

  for (const event of events ?? []) {
    if (eventsByDay[event.data]) {
      eventsByDay[event.data].push(event);
    }
  }

  return eventsByDay;
}

function getStatusLabel(status: string) {
  return statusLabels[status] ?? status;
}

function AgendaEventCard({ event }: { event: AdminAgendaEvent }) {
  const router = useRouter();
  const styles = eventTypeStyles[event.tipo];
  const unitCount = event.unidades.length;

  return (
    <button
      type="button"
      onClick={() => router.push(`/admin/pedidos/${event.pedido.id}`)}
      className={`w-full rounded-lg border p-3 text-left shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} />
          <span className={`truncate text-xs font-bold uppercase ${styles.text}`}>
            {event.label}
          </span>
        </div>
        <span className="shrink-0 rounded-md bg-white/80 px-2 py-1 text-[11px] font-bold text-zinc-700">
          #{event.pedido.id}
        </span>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <span className="truncate text-sm font-bold text-zinc-900">
          {event.pedido.cliente_nome}
        </span>
        <span className="text-xs font-medium text-zinc-600">
          {getStatusLabel(event.pedido.status)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {event.pedido.tem_kit_festa ? (
          <span className="rounded-md border border-pink-200 bg-pink-50 px-2 py-1 text-[11px] font-bold text-pink-700">
            Kit festa
          </span>
        ) : null}
        {unitCount > 0 ? (
          <span className="rounded-md border border-zinc-200 bg-white/80 px-2 py-1 text-[11px] font-semibold text-zinc-600">
            {unitCount} unidade{unitCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function AdminAgendaPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [typeFilter, setTypeFilter] = useState<AdminAgendaTypeFilter>("todos");
  const [agenda, setAgenda] = useState<AdminAgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekLabel = `${formatDisplayDate(weekStart)} - ${formatDisplayDate(weekEnd)}`;
  const eventsByDay = useMemo(
    () => getEventsByDay(agenda?.eventos, weekDays),
    [agenda?.eventos, weekDays],
  );
  const todayKey = formatApiDate(new Date());
  const hasEvents = Boolean(agenda && agenda.eventos.length > 0);

  useEffect(() => {
    let active = true;

    async function loadAgenda() {
      setLoading(true);
      setError(null);

      try {
        const data = await obterAgendaAdmin({
          inicio: formatApiDate(weekStart),
          fim: formatApiDate(weekEnd),
          tipo: typeFilter,
        });

        if (!active) {
          return;
        }

        setAgenda(data);
      } catch (err) {
        if (!active) {
          return;
        }

        setAgenda(null);
        setError(getAgendaErrorMessage(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAgenda();

    return () => {
      active = false;
    };
  }, [typeFilter, weekEnd, weekStart]);

  function goToToday() {
    setWeekStart(getWeekStart(new Date()));
  }

  function goToPreviousWeek() {
    setWeekStart((current) => addDays(current, -7));
  }

  function goToNextWeek() {
    setWeekStart((current) => addDays(current, 7));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Agenda operacional</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Eventos reais de pedidos, reservas e contratos no painel administrativo.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={goToPreviousWeek}
              aria-label="Semana anterior"
              className="h-10 w-10 rounded-lg border border-zinc-200 bg-white text-lg font-bold text-zinc-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={goToNextWeek}
              aria-label="Proxima semana"
              className="h-10 w-10 rounded-lg border border-zinc-200 bg-white text-lg font-bold text-zinc-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
            >
              &gt;
            </button>
          </div>

          <div className="min-w-60 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm font-bold text-zinc-800">
            {weekLabel}
          </div>

          <div className="w-full md:w-64">
            <Select
              label="Tipo"
              options={eventTypeOptions}
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as AdminAgendaTypeFilter)
              }
            />
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      ) : null}

      {!error ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 text-sm font-medium text-zinc-600 shadow-sm">
          {loading
            ? "Carregando agenda operacional..."
            : `${agenda?.resumo.total ?? 0} evento(s) no periodo selecionado.`}
        </div>
      ) : null}

      {!loading && !error && agenda && !hasEvents ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
          Nenhum evento operacional encontrado para esta semana.
        </div>
      ) : null}

      {!loading && !error && agenda ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {eventTypeOptions
              .filter(
                (option): option is { value: AdminAgendaEventType; label: string } =>
                  option.value !== "todos",
              )
              .map((option) => {
                const styles = eventTypeStyles[option.value];
                return (
                  <div
                    key={option.value}
                    className={`rounded-lg border px-4 py-3 shadow-sm ${styles.summary}`}
                  >
                    <span className={`text-2xl font-black ${styles.text}`}>
                      {agenda.resumo.por_tipo[option.value]}
                    </span>
                    <span className="mt-1 block text-xs font-bold uppercase text-zinc-500">
                      {eventTypeLabels[option.value]}
                    </span>
                  </div>
                );
              })}
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-2xl font-black text-zinc-900">
                {agenda.resumo.total}
              </span>
              <span className="mt-1 block text-xs font-bold uppercase text-zinc-500">
                Total
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="grid min-w-[980px] grid-cols-7 border-b border-zinc-200 bg-zinc-50">
              {weekDays.map((date) => {
                const dateKey = formatApiDate(date);
                const isToday = dateKey === todayKey;

                return (
                  <div
                    key={dateKey}
                    className="border-r border-zinc-200 px-4 py-3 last:border-r-0"
                  >
                    <span className="block text-xs font-bold uppercase text-zinc-400">
                      {formatDayName(date)}
                    </span>
                    <span
                      className={`mt-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-black ${
                        isToday
                          ? "bg-teal-600 text-white"
                          : "bg-white text-zinc-900"
                      }`}
                    >
                      {String(date.getDate()).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid min-w-[980px] grid-cols-7">
              {weekDays.map((date) => {
                const dateKey = formatApiDate(date);
                const dayEvents = eventsByDay[dateKey] ?? [];

                return (
                  <div
                    key={dateKey}
                    className="min-h-[420px] border-r border-zinc-200 bg-white p-3 last:border-r-0"
                  >
                    {dayEvents.length === 0 ? (
                      <div className="flex h-full min-h-28 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 text-center text-xs font-medium text-zinc-400">
                        Sem eventos
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {dayEvents.map((event) => (
                          <AgendaEventCard key={event.id} event={event} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
