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
  { value: "locacao_em_andamento", label: "Locação em andamento" },
];

const eventTypeLabels: Record<AdminAgendaEventType, string> = {
  entrega: "Entregas",
  retirada: "Retiradas",
  contrato_pendente: "Contratos pendentes",
  locacao_em_andamento: "Locações em andamento",
};

const eventTypeSingleLabels: Record<AdminAgendaEventType, string> = {
  entrega: "Entrega",
  retirada: "Retirada",
  contrato_pendente: "Contrato pendente",
  locacao_em_andamento: "Locação em andamento",
};

const eventTypeStyles: Record<
  AdminAgendaEventType,
  {
    accent: string;
    badge: string;
    card: string;
    dot: string;
    legend: string;
    summary: string;
    text: string;
  }
> = {
  entrega: {
    accent: "border-l-cyan-500",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-800",
    card: "border-cyan-200 bg-cyan-50/80 hover:bg-cyan-100",
    dot: "bg-cyan-500",
    legend: "border-cyan-100 bg-cyan-50/60",
    summary: "border-cyan-200 bg-cyan-50",
    text: "text-cyan-800",
  },
  retirada: {
    accent: "border-l-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    card: "border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100",
    dot: "bg-emerald-500",
    legend: "border-emerald-100 bg-emerald-50/60",
    summary: "border-emerald-200 bg-emerald-50",
    text: "text-emerald-800",
  },
  contrato_pendente: {
    accent: "border-l-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-800",
    card: "border-rose-200 bg-rose-50/80 hover:bg-rose-100",
    dot: "bg-rose-500",
    legend: "border-rose-100 bg-rose-50/60",
    summary: "border-rose-200 bg-rose-50",
    text: "text-rose-800",
  },
  locacao_em_andamento: {
    accent: "border-l-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-800",
    card: "border-violet-200 bg-violet-50/80 hover:bg-violet-100",
    dot: "bg-violet-500",
    legend: "border-violet-100 bg-violet-50/60",
    summary: "border-violet-200 bg-violet-50",
    text: "text-violet-800",
  },
};

const statusLabels: Record<string, string> = {
  aguardando_analise: "Aguardando análise",
  reservado: "Reservado",
  confirmado: "Confirmado",
  em_locacao: "Em locação",
  retirado: "Retirado",
  cancelado: "Cancelado",
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
      return "Você precisa estar autenticado para acessar a agenda administrativa.";
    }

    if (error.status === 403) {
      return "Seu usuário não tem permissão de admin/staff para acessar esta agenda.";
    }

    return error.message;
  }

  return "Não foi possível carregar a agenda administrativa agora.";
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

function dateFromApi(date: string) {
  return new Date(`${date}T00:00:00`);
}

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatApiDisplayDate(date: string) {
  return formatDisplayDate(dateFromApi(date));
}

function formatPeriodDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
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

function getPeriodLabel(start: Date, end: Date) {
  return `${formatPeriodDate(start)} - ${formatPeriodDate(end)}`;
}

function AgendaEventCard({
  event,
  isSelected,
  onSelect,
}: {
  event: AdminAgendaEvent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const styles = eventTypeStyles[event.tipo];
  const unitCount = event.unidades.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full cursor-pointer rounded-md border border-l-4 px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${styles.card} ${styles.accent} ${
        isSelected ? "ring-2 ring-teal-500" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`truncate text-[10px] font-black uppercase ${styles.text}`}>
          {eventTypeSingleLabels[event.tipo]}
        </span>
        <span className="shrink-0 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-zinc-700">
          #{event.pedido.id}
        </span>
      </div>

      <span className="mt-1 block truncate text-xs font-black text-zinc-950">
        {event.pedido.cliente_nome}
      </span>

      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold text-zinc-600">
          {getStatusLabel(event.pedido.status)}
        </span>
        {unitCount > 0 ? (
          <span className="shrink-0 text-[10px] font-bold text-zinc-500">
            {unitCount} un.
          </span>
        ) : null}
      </div>

      {event.pedido.tem_kit_festa ? (
        <span className="mt-1.5 inline-flex rounded border border-pink-200 bg-pink-50 px-1.5 py-0.5 text-[10px] font-black text-pink-700">
          Kit festa
        </span>
      ) : null}
    </button>
  );
}

function EventDetailsPanel({ event }: { event: AdminAgendaEvent | null }) {
  const router = useRouter();

  if (!event) {
    return (
      <aside className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm xl:sticky xl:top-4 xl:h-fit">
        <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 text-center">
          <span className="text-sm font-black text-zinc-700">
            Nenhum evento selecionado
          </span>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Selecione um card da semana para ver os dados operacionais
            disponíveis.
          </p>
        </div>
      </aside>
    );
  }

  const styles = eventTypeStyles[event.tipo];

  return (
    <aside className="rounded-lg border border-zinc-200 bg-white shadow-sm xl:sticky xl:top-4 xl:h-fit">
      <div className={`border-b border-zinc-200 px-5 py-4 ${styles.summary}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-black uppercase ${styles.badge}`}
            >
              {eventTypeSingleLabels[event.tipo]}
            </span>
            <h2 className="mt-3 text-lg font-black text-zinc-950">
              Pedido #{event.pedido.id}
            </h2>
          </div>
          <span className={`mt-1 h-3 w-3 rounded-full ${styles.dot}`} />
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <span className="text-[11px] font-black uppercase text-zinc-400">
            Cliente
          </span>
          <p className="mt-1 text-sm font-black text-zinc-950">
            {event.pedido.cliente_nome}
          </p>
          {event.pedido.cliente_telefone ? (
            <p className="mt-1 text-sm font-medium text-zinc-600">
              {event.pedido.cliente_telefone}
            </p>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <dt className="text-[11px] font-black uppercase text-zinc-400">
              Status
            </dt>
            <dd className="mt-1 font-bold text-zinc-900">
              {getStatusLabel(event.pedido.status)}
            </dd>
          </div>
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <dt className="text-[11px] font-black uppercase text-zinc-400">
              Data
            </dt>
            <dd className="mt-1 font-bold text-zinc-900">
              {formatApiDisplayDate(event.data)}
            </dd>
          </div>
          <div className="col-span-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <dt className="text-[11px] font-black uppercase text-zinc-400">
              Período da locação
            </dt>
            <dd className="mt-1 font-bold text-zinc-900">
              {formatApiDisplayDate(event.pedido.data_inicio_locacao)} até{" "}
              {formatApiDisplayDate(event.pedido.data_fim_locacao)}
            </dd>
          </div>
        </dl>

        <div>
          <span className="text-[11px] font-black uppercase text-zinc-400">
            Unidades
          </span>
          {event.unidades.length > 0 ? (
            <div className="mt-2 space-y-2">
              {event.unidades.map((unidade) => (
                <div
                  key={unidade.id}
                  className="rounded-md border border-zinc-200 bg-white p-3"
                >
                  <p className="truncate text-sm font-black text-zinc-950">
                    {unidade.brinquedo}
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    {unidade.codigo} · {unidade.status}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-3 text-xs font-medium text-zinc-500">
              Nenhuma unidade retornada para este evento.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push(`/admin/pedidos/${event.pedido.id}`)}
          className="h-10 w-full rounded-lg bg-teal-600 px-4 text-sm font-black text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          Ver pedido
        </button>
      </div>
    </aside>
  );
}

export default function AdminAgendaPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [typeFilter, setTypeFilter] = useState<AdminAgendaTypeFilter>("todos");
  const [agenda, setAgenda] = useState<AdminAgendaResponse | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AdminAgendaEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekLabel = `${formatDisplayDate(weekStart)} - ${formatDisplayDate(weekEnd)}`;
  const compactWeekLabel = getPeriodLabel(weekStart, weekEnd);
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
        setSelectedEvent((current) => {
          if (current && data.eventos.some((event) => event.id === current.id)) {
            return current;
          }

          return null;
        });
      } catch (err) {
        if (!active) {
          return;
        }

        setAgenda(null);
        setSelectedEvent(null);
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
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-100 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black text-zinc-950">Agenda</h1>
            <span className="text-sm font-medium text-zinc-600">
              {weekLabel}
            </span>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="inline-flex h-9 w-fit rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
              <button
                type="button"
                className="rounded px-3 text-sm font-medium text-zinc-950 shadow-sm ring-1 ring-zinc-200 bg-white"
              >
                Semana
              </button>
              <button
                type="button"
                disabled
                aria-label="Visualizacao mensal ainda nao disponivel"
                className="rounded px-3 text-sm font-medium text-zinc-400"
              >
                Mês
              </button>
            </div>

            <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white p-1">
              <button
                type="button"
                onClick={goToToday}
                className="h-8 rounded px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={goToPreviousWeek}
                aria-label="Semana anterior"
                className="h-8 w-8 rounded text-lg font-medium text-zinc-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
              >
                &lt;
              </button>
              <span className="hidden min-w-32 px-2 text-center text-sm font-medium text-zinc-900 sm:inline">
                {compactWeekLabel}
              </span>
              <button
                type="button"
                onClick={goToNextWeek}
                aria-label="Próxima semana"
                className="h-8 w-8 rounded text-lg font-medium text-zinc-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
              >
                &gt;
              </button>
            </div>

            <div className="w-full lg:w-56">
              <Select
                aria-label="Tipo"
                options={eventTypeOptions}
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as AdminAgendaTypeFilter)
                }
                className="h-9 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-4 py-3">
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
                  className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-normal text-zinc-950 ${styles.legend}`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${styles.dot}`} />
                  {option.label}
                </span>
              );
            })}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      ) : null}

      {!error ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-600 shadow-sm">
          {loading
            ? "Carregando eventos operacionais..."
            : `${agenda?.resumo.total ?? 0} evento(s) no período selecionado.`}
        </div>
      ) : null}

      {!loading && !error && agenda && !hasEvents ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Nenhum evento operacional encontrado para esta semana.
        </div>
      ) : null}

      {!loading && !error && agenda ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="grid min-w-[980px] grid-cols-7 border-b border-zinc-200 bg-zinc-50">
                {weekDays.map((date) => {
                  const dateKey = formatApiDate(date);
                  const isToday = dateKey === todayKey;
                  const dayEvents = eventsByDay[dateKey] ?? [];

                  return (
                    <div
                      key={dateKey}
                      className={`border-r border-zinc-200 px-3 py-2.5 last:border-r-0 ${
                        isToday ? "bg-teal-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="block text-[11px] font-black uppercase text-zinc-400">
                            {formatDayName(date)}
                          </span>
                          <span
                            className={`mt-1 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-black ${
                              isToday
                                ? "bg-teal-600 text-white"
                                : "bg-white text-zinc-900"
                            }`}
                          >
                            {String(date.getDate()).padStart(2, "0")}
                          </span>
                        </div>
                        <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-zinc-500">
                          {getDayEventText(dayEvents.length)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid min-w-[980px] grid-cols-7">
                {weekDays.map((date) => {
                  const dateKey = formatApiDate(date);
                  const dayEvents = eventsByDay[dateKey] ?? [];
                  const isToday = dateKey === todayKey;

                  return (
                    <div
                      key={dateKey}
                      className={`min-h-[520px] border-r border-zinc-200 p-2.5 last:border-r-0 ${
                        isToday ? "bg-teal-50/40" : "bg-white"
                      }`}
                    >
                      {dayEvents.length === 0 ? (
                        <div className="flex h-full min-h-28 items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50/70 px-2 text-center text-[11px] font-medium text-zinc-400">
                          Sem eventos
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {dayEvents.map((event) => (
                            <AgendaEventCard
                              key={event.id}
                              event={event}
                              isSelected={selectedEvent?.id === event.id}
                              onSelect={() => setSelectedEvent(event)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <EventDetailsPanel event={selectedEvent} />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm md:grid-cols-5">
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
                    className={`rounded-md border px-3 py-2 ${styles.summary}`}
                  >
                    <span className={`block text-xl font-black ${styles.text}`}>
                      {agenda.resumo.por_tipo[option.value]}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-black uppercase text-zinc-500">
                      {eventTypeLabels[option.value]}
                    </span>
                  </div>
                );
              })}
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
              <span className="block text-xl font-black text-zinc-950">
                {agenda.resumo.total}
              </span>
              <span className="mt-0.5 block text-[10px] font-black uppercase text-zinc-500">
                Total de eventos
              </span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
