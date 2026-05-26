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
    badge: string;
    dot: string;
    rail: string;
    summary: string;
    text: string;
  }
> = {
  entrega: {
    badge: "border-cyan-200 bg-cyan-100 text-cyan-800",
    card: "border-cyan-200 bg-cyan-50 hover:border-cyan-300 hover:bg-cyan-100",
    dot: "bg-cyan-500",
    rail: "border-l-cyan-500",
    summary: "border-cyan-200 bg-cyan-50",
    text: "text-cyan-800",
  },
  retirada: {
    badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
    card: "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100",
    dot: "bg-emerald-500",
    rail: "border-l-emerald-500",
    summary: "border-emerald-200 bg-emerald-50",
    text: "text-emerald-800",
  },
  contrato_pendente: {
    badge: "border-rose-200 bg-rose-100 text-rose-800",
    card: "border-rose-200 bg-rose-50 hover:border-rose-300 hover:bg-rose-100",
    dot: "bg-rose-500",
    rail: "border-l-rose-500",
    summary: "border-rose-200 bg-rose-50",
    text: "text-rose-800",
  },
  locacao_em_andamento: {
    badge: "border-indigo-200 bg-indigo-100 text-indigo-800",
    card: "border-indigo-200 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100",
    dot: "bg-indigo-500",
    rail: "border-l-indigo-500",
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

function getDayEventText(count: number) {
  if (count === 1) {
    return "1 evento";
  }

  return `${count} eventos`;
}

function AgendaEventCard({ event }: { event: AdminAgendaEvent }) {
  const router = useRouter();
  const styles = eventTypeStyles[event.tipo];
  const unitCount = event.unidades.length;

  return (
    <button
      type="button"
      onClick={() => router.push(`/admin/pedidos/${event.pedido.id}`)}
      className={`group w-full cursor-pointer rounded-lg border border-l-4 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${styles.card} ${styles.rail}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} />
          <span className={`truncate text-[11px] font-black uppercase ${styles.text}`}>
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
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-zinc-600">
            {getStatusLabel(event.pedido.status)}
          </span>
          <span className="text-[11px] font-bold text-zinc-400 transition-colors group-hover:text-zinc-600">
            Ver pedido
          </span>
        </div>
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
  const selectedTypeLabel =
    eventTypeOptions.find((option) => option.value === typeFilter)?.label ??
    "Todos os tipos";

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
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-zinc-100 p-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="text-xs font-black uppercase text-teal-700">
              Painel operacional
            </span>
            <h1 className="mt-1 text-2xl font-black text-zinc-950">
              Agenda operacional
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Visualize entregas, retiradas, contratos pendentes e locacoes em
              andamento geradas pelo backend.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={goToPreviousWeek}
                aria-label="Semana anterior"
                className="h-10 w-10 rounded-lg border border-zinc-200 bg-white text-lg font-black text-zinc-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
              >
                &lt;
              </button>
              <button
                type="button"
                onClick={goToNextWeek}
                aria-label="Proxima semana"
                className="h-10 w-10 rounded-lg border border-zinc-200 bg-white text-lg font-black text-zinc-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
              >
                &gt;
              </button>
            </div>

            <div className="min-w-60 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-black text-zinc-900">
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

        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {eventTypeOptions
              .filter(
                (option): option is { value: AdminAgendaEventType; label: string } =>
                  option.value !== "todos",
              )
              .map((option) => {
                const styles = eventTypeStyles[option.value];

                return (
                  <span
                    key={option.value}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-black ${styles.badge}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                    {option.label}
                  </span>
                );
              })}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-600">
            Filtro ativo: <span className="text-zinc-950">{selectedTypeLabel}</span>
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
            ? "Carregando eventos operacionais..."
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
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase text-zinc-500">
                        {eventTypeLabels[option.value]}
                      </span>
                      <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                    </div>
                    <span className={`mt-3 block text-3xl font-black ${styles.text}`}>
                      {agenda.resumo.por_tipo[option.value]}
                    </span>
                  </div>
                );
              })}
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase text-zinc-500">
                  Total
                </span>
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-900" />
              </div>
              <span className="mt-3 block text-3xl font-black text-zinc-900">
                {agenda.resumo.total}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="grid min-w-[1050px] grid-cols-7 border-b border-zinc-200 bg-zinc-50">
              {weekDays.map((date) => {
                const dateKey = formatApiDate(date);
                const isToday = dateKey === todayKey;
                const dayEvents = eventsByDay[dateKey] ?? [];

                return (
                  <div
                    key={dateKey}
                    className={`border-r border-zinc-200 px-4 py-3 last:border-r-0 ${
                      isToday ? "bg-teal-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-xs font-black uppercase text-zinc-400">
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
                      <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-bold text-zinc-500">
                        {getDayEventText(dayEvents.length)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid min-w-[1050px] grid-cols-7">
              {weekDays.map((date) => {
                const dateKey = formatApiDate(date);
                const dayEvents = eventsByDay[dateKey] ?? [];
                const isToday = dateKey === todayKey;

                return (
                  <div
                    key={dateKey}
                    className={`min-h-[440px] border-r border-zinc-200 p-3 last:border-r-0 ${
                      isToday ? "bg-teal-50/40" : "bg-white"
                    }`}
                  >
                    {dayEvents.length === 0 ? (
                      <div className="flex h-full min-h-28 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 text-center text-xs font-medium text-zinc-400">
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
