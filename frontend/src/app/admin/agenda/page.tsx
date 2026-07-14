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

const calendarStartHour = 7;
const calendarEndHour = 19;
const calendarHours = Array.from(
  { length: calendarEndHour - calendarStartHour },
  (_, index) => index + calendarStartHour,
);
const untimedEventTopOffset = 12;
const untimedEventGap = 76;

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
    badge: "border-cyan-200 bg-cyan-50 text-zinc-800",
    card: "border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100/70",
    dot: "bg-cyan-500",
    legend: "border-cyan-100 bg-cyan-50/60",
    summary: "border-cyan-200 bg-cyan-50",
    text: "text-zinc-800",
  },
  retirada: {
    accent: "border-l-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-zinc-800",
    card: "border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70",
    dot: "bg-emerald-500",
    legend: "border-emerald-100 bg-emerald-50/60",
    summary: "border-emerald-200 bg-emerald-50",
    text: "text-zinc-800",
  },
  contrato_pendente: {
    accent: "border-l-rose-500",
    badge: "border-rose-200 bg-rose-50 text-zinc-800",
    card: "border-rose-200 bg-rose-50/70 hover:bg-rose-100/70",
    dot: "bg-rose-500",
    legend: "border-rose-100 bg-rose-50/60",
    summary: "border-rose-200 bg-rose-50",
    text: "text-zinc-800",
  },
  locacao_em_andamento: {
    accent: "border-l-violet-500",
    badge: "border-violet-200 bg-violet-50 text-zinc-800",
    card: "border-violet-200 bg-violet-50/70 hover:bg-violet-100/70",
    dot: "bg-violet-500",
    legend: "border-violet-100 bg-violet-50/60",
    summary: "border-violet-200 bg-violet-50",
    text: "text-zinc-800",
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
  activeDays: Date[],
) {
  const eventsByDay = activeDays.reduce<Record<string, AdminAgendaEvent[]>>(
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

function formatCalendarHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getCalendarHourTopOffset(hour: number) {
  const percentage =
    ((hour - calendarStartHour) / (calendarEndHour - calendarStartHour)) * 100;

  return `${percentage}%`;
}

function formatEventTime(event: AdminAgendaEvent) {
  return event.hora_inicio ? event.hora_inicio.slice(0, 5) : "Sem horário";
}

function getEventTopOffset(event: AdminAgendaEvent, index: number) {
  if (!event.hora_inicio) {
    return `${untimedEventTopOffset + index * untimedEventGap}px`;
  }

  const [hourText, minuteText = "0"] = event.hora_inicio.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return `${untimedEventTopOffset + index * untimedEventGap}px`;
  }

  const eventHour = hour + minute / 60;
  const clampedHour = Math.min(
    Math.max(eventHour, calendarStartHour),
    calendarEndHour,
  );
  const percentage =
    ((clampedHour - calendarStartHour) / (calendarEndHour - calendarStartHour)) *
    100;

  return `calc(${percentage}% + 6px)`;
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
      className={`group w-full cursor-pointer rounded border border-l-4 px-2 py-1.5 text-left transition-colors hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${styles.card} ${styles.accent} ${
        isSelected ? "ring-2 ring-teal-500" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-[10px] font-semibold text-zinc-800">
          {formatEventTime(event)}
        </span>
        <span className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
          #{event.pedido.id}
        </span>
      </div>

      <span className={`mt-0.5 block truncate text-[10px] font-semibold ${styles.text}`}>
        {eventTypeSingleLabels[event.tipo]}
      </span>

      <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-900">
        {event.pedido.cliente_nome}
      </span>

      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-normal text-zinc-600">
          {getStatusLabel(event.pedido.status)}
        </span>
        {unitCount > 0 ? (
          <span className="shrink-0 text-[10px] font-normal text-zinc-500">
            {unitCount} un.
          </span>
        ) : null}
      </div>

      {event.pedido.tem_kit_festa ? (
        <span className="mt-1 inline-flex rounded border border-pink-200 bg-pink-50 px-1.5 py-0.5 text-[10px] font-normal text-zinc-700">
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
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 text-center">
          <span className="text-sm font-semibold text-zinc-700">
            Nenhum evento selecionado
          </span>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Selecione um card para ver os dados operacionais disponíveis.
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
              className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium uppercase ${styles.badge}`}
            >
              {eventTypeSingleLabels[event.tipo]}
            </span>
            <h2 className="mt-3 text-lg font-bold text-zinc-950">
              Pedido #{event.pedido.id}
            </h2>
          </div>
          <span className={`mt-1 h-3 w-3 rounded-full ${styles.dot}`} />
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <span className="text-[11px] font-semibold uppercase text-zinc-500">
            Cliente
          </span>
          <p className="mt-1 text-sm font-semibold text-zinc-950">
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
            <dt className="text-[11px] font-semibold uppercase text-zinc-500">
              Status
            </dt>
            <dd className="mt-1 font-medium text-zinc-900">
              {getStatusLabel(event.pedido.status)}
            </dd>
          </div>
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <dt className="text-[11px] font-semibold uppercase text-zinc-500">
              Data
            </dt>
            <dd className="mt-1 font-medium text-zinc-900">
              {formatApiDisplayDate(event.data)}
            </dd>
          </div>
          <div className="col-span-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <dt className="text-[11px] font-semibold uppercase text-zinc-500">
              Período da locação
            </dt>
            <dd className="mt-1 font-medium text-zinc-900">
              {formatApiDisplayDate(event.pedido.data_inicio_locacao)} até{" "}
              {formatApiDisplayDate(event.pedido.data_fim_locacao)}
            </dd>
          </div>
        </dl>

        <div>
          <span className="text-[11px] font-semibold uppercase text-zinc-500">
            Unidades
          </span>
          {event.unidades.length > 0 ? (
            <div className="mt-2 space-y-2">
              {event.unidades.map((unidade) => (
                <div
                  key={unidade.id}
                  className="rounded-md border border-zinc-200 bg-white p-3"
                >
                  <p className="truncate text-sm font-semibold text-zinc-950">
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
          className="h-10 w-full rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          Ver pedido
        </button>
      </div>
    </aside>
  );
}

export default function AdminAgendaPage() {
  const [referenceDate, setReferenceDate] = useState(() => normalizeDate(new Date()));
  const [viewMode, setViewMode] = useState<"semana" | "mes">("semana");
  const [typeFilter, setTypeFilter] = useState<AdminAgendaTypeFilter>("todos");
  const [agenda, setAgenda] = useState<AdminAgendaResponse | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AdminAgendaEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekStart = useMemo(() => getWeekStart(referenceDate), [referenceDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const monthStart = useMemo(
    () => new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
    [referenceDate],
  );
  const monthGridStart = useMemo(() => getWeekStart(monthStart), [monthStart]);

  const gridStart = viewMode === "semana" ? weekStart : monthGridStart;
  const gridDaysCount = viewMode === "semana" ? 7 : 42;

  const activeDays = useMemo(
    () => Array.from({ length: gridDaysCount }, (_, index) => addDays(gridStart, index)),
    [gridStart, gridDaysCount],
  );

  const apiStart = viewMode === "semana" ? weekStart : monthStart;

  const apiEnd = useMemo(() => {
    if (viewMode === "semana") {
      return weekEnd;
    }
    return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  }, [viewMode, weekEnd, monthStart]);

  const displayLabel =
    viewMode === "semana"
      ? `${formatDisplayDate(apiStart)} - ${formatDisplayDate(apiEnd)}`
      : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
          .format(referenceDate)
          .replace(/^\w/, (c) => c.toUpperCase());

  const compactLabel =
    viewMode === "semana"
      ? `${formatPeriodDate(apiStart)} - ${formatPeriodDate(apiEnd)}`
      : new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(referenceDate);

  const eventsByDay = useMemo(
    () => getEventsByDay(agenda?.eventos, activeDays),
    [agenda?.eventos, activeDays],
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
          inicio: formatApiDate(apiStart),
          fim: formatApiDate(apiEnd),
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
  }, [typeFilter, apiStart, apiEnd]);

  function goToToday() {
    setReferenceDate(normalizeDate(new Date()));
  }

  function goToPrevious() {
    if (viewMode === "semana") {
      setReferenceDate((current) => addDays(current, -7));
    } else {
      setReferenceDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
    }
  }

  function goToNext() {
    if (viewMode === "semana") {
      setReferenceDate((current) => addDays(current, 7));
    } else {
      setReferenceDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
    }
  }

  function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.value) {
      const [year, month, day] = event.target.value.split("-").map(Number);
      setReferenceDate(normalizeDate(new Date(year, month - 1, day)));
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col gap-3">
      {/* CABEÇALHO COM LAYOUT RESPONSIVO ATUALIZADO */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm p-4">
        <div className="flex flex-col gap-4">
          {/* Linha 1: Título e Navegação de Data */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-zinc-950">Agenda Operacional</h1>
              <span className="text-xs font-normal text-zinc-600">{displayLabel}</span>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 w-full sm:w-auto">
              <button type="button" onClick={goToToday} className="hidden sm:block h-7 rounded px-2.5 text-xs font-medium text-zinc-700 hover:bg-teal-50 hover:text-teal-700">
                Hoje
              </button>
              <button type="button" onClick={goToPrevious} className="flex-1 sm:flex-none p-2 sm:h-7 sm:w-7 sm:p-0 flex items-center justify-center hover:bg-white rounded shadow-sm sm:shadow-none text-sm font-medium transition-colors">
                &lt;
              </button>
              <input type="date" value={formatApiDate(referenceDate)} onChange={handleDateChange} className="flex-[2] sm:flex-none text-center bg-transparent text-sm font-bold border-0 outline-none cursor-pointer hover:bg-teal-50 rounded" />
              <button type="button" onClick={goToNext} className="flex-1 sm:flex-none p-2 sm:h-7 sm:w-7 sm:p-0 flex items-center justify-center hover:bg-white rounded shadow-sm sm:shadow-none text-sm font-medium transition-colors">
                &gt;
              </button>
            </div>
          </div>

          {/* Linha 2: Filtros */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex gap-2 w-full lg:w-auto">
              <button type="button" onClick={() => setViewMode("semana")} className={`flex-1 lg:w-32 py-2 text-xs font-bold rounded-lg border transition-colors ${viewMode === 'semana' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}>
                Semana
              </button>
              <button type="button" onClick={() => setViewMode("mes")} className={`flex-1 lg:w-32 py-2 text-xs font-bold rounded-lg border transition-colors ${viewMode === 'mes' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}>
                Mês
              </button>
            </div>
            <div className="w-full lg:flex-1">
              <Select aria-label="Tipo" options={eventTypeOptions} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AdminAgendaTypeFilter)} className="w-full h-10 lg:h-9" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 pt-4 border-t border-zinc-100">
          {eventTypeOptions.filter((option): option is { value: AdminAgendaEventType; label: string } => option.value !== "todos").map((option) => {
            const styles = eventTypeStyles[option.value];
            return (
              <span key={option.value} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-normal text-zinc-700 ${styles.legend}`}>
                <span className={`h-2 w-2 shrink-0 rounded-sm ${styles.dot}`} />
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
        <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-normal text-zinc-600 shadow-sm">
          {loading
            ? "Carregando eventos operacionais..."
            : `${agenda?.resumo.total ?? 0} evento(s) no período selecionado.`}
        </div>
      ) : null}

      {!loading && !error && agenda && !hasEvents ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Nenhum evento operacional encontrado para o período selecionado.
        </div>
      ) : null}

      {!loading && !error && agenda ? (
        <>
          <div className="grid flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
              
              {viewMode === "mes" ? (
                <div className="flex min-w-[840px] flex-col">
                  <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
                    {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((dayName) => (
                      <div
                        key={dayName}
                        className="border-r border-zinc-200 p-2 text-center text-[11px] font-semibold uppercase text-zinc-500 last:border-r-0"
                      >
                        {dayName}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {activeDays.map((date) => {
                      const dateKey = formatApiDate(date);
                      const isToday = dateKey === todayKey;
                      const isCurrentMonth = date.getMonth() === referenceDate.getMonth();
                      const dayEvents = eventsByDay[dateKey] ?? [];

                      return (
                        <div
                          key={dateKey}
                          className={`min-h-[120px] border-b border-r border-zinc-200 p-1.5 [&:nth-child(7n)]:border-r-0 ${
                            isCurrentMonth ? "bg-white" : "bg-zinc-50/50"
                          } ${isToday ? "bg-teal-50/30" : ""}`}
                        >
                          <div className="mb-1 flex items-center justify-between px-1">
                            <span
                              className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold ${
                                isToday
                                  ? "bg-teal-600 text-white"
                                  : isCurrentMonth
                                    ? "text-zinc-900"
                                    : "text-zinc-400"
                              }`}
                            >
                              {date.getDate()}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="text-[10px] font-medium text-zinc-500">
                                {dayEvents.length} ev.
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col gap-1">
                            {dayEvents.slice(0, 4).map((event) => {
                              const styles = eventTypeStyles[event.tipo];
                              const isSelected = selectedEvent?.id === event.id;

                              return (
                                <button
                                  key={event.id}
                                  type="button"
                                  onClick={() => setSelectedEvent(event)}
                                  className={`w-full truncate rounded border border-l-2 px-1.5 py-1 text-left text-[10px] font-medium transition-colors hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                    styles.card
                                  } ${styles.accent} ${
                                    isSelected ? "ring-2 ring-teal-500" : ""
                                  }`}
                                  title={`${formatEventTime(event)} - ${event.pedido.cliente_nome}`}
                                >
                                  <span className="mr-1 font-semibold text-zinc-700">
                                    {formatEventTime(event)}
                                  </span>
                                  {event.pedido.cliente_nome.split(" ")[0]}
                                </button>
                              );
                            })}
                            {dayEvents.length > 4 && (
                              <span className="pl-1 text-[10px] font-medium text-zinc-500">
                                +{dayEvents.length - 4} eventos
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid min-w-[840px] grid-cols-[44px_repeat(7,minmax(0,1fr))] border-b border-zinc-200 bg-zinc-50">
                    <div className="border-r border-zinc-200" />
                    {activeDays.map((date) => {
                      const dateKey = formatApiDate(date);
                      const isToday = dateKey === todayKey;
                      const dayEvents = eventsByDay[dateKey] ?? [];

                      return (
                        <div
                          key={dateKey}
                          className={`border-r border-zinc-200 px-2.5 py-2 last:border-r-0 ${
                            isToday ? "bg-teal-50" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="block text-[11px] font-semibold uppercase text-zinc-500">
                                {formatDayName(date)}
                              </span>
                              <span
                                className={`mt-1 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-black ${
                                  isToday ? "bg-teal-600 text-white" : "bg-white text-zinc-900"
                                }`}
                              >
                                {String(date.getDate()).padStart(2, "0")}
                              </span>
                            </div>
                            <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-normal text-zinc-500">
                              {getDayEventText(dayEvents.length)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid min-w-[840px] grid-cols-[44px_repeat(7,minmax(0,1fr))]">
                    <div className="relative min-h-[calc(100vh-17.5rem)] border-r border-zinc-200 bg-zinc-50/80">
                      {calendarHours.map((hour) => (
                        <span
                          key={hour}
                          className="absolute right-2 -translate-y-1/2 text-[10px] font-normal text-zinc-500"
                          style={{ top: getCalendarHourTopOffset(hour) }}
                        >
                          {formatCalendarHour(hour)}
                        </span>
                      ))}
                    </div>

                    {activeDays.map((date) => {
                      const dateKey = formatApiDate(date);
                      const dayEvents = eventsByDay[dateKey] ?? [];
                      const isToday = dateKey === todayKey;

                      return (
                        <div
                          key={dateKey}
                          className={`min-h-[calc(100vh-17.5rem)] border-r border-zinc-200 last:border-r-0 ${
                            isToday ? "bg-teal-50/40" : "bg-white"
                          }`}
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(to bottom, transparent 0, transparent calc((100% / 12) - 1px), rgba(212, 212, 216, 0.7) calc((100% / 12) - 1px), rgba(212, 212, 216, 0.7) calc(100% / 12))",
                          }}
                        >
                          <div className="relative h-full min-h-[calc(100vh-17.5rem)]">
                            {dayEvents.length === 0 ? (
                              <span className="absolute left-2 top-3 rounded bg-white/80 px-1.5 py-0.5 text-[11px] font-normal text-zinc-400">
                                Sem eventos
                              </span>
                            ) : (
                              dayEvents.map((event, eventIndex) => (
                                <div
                                  key={event.id}
                                  className="absolute left-2 right-2"
                                  style={{ top: getEventTopOffset(event, eventIndex) }}
                                >
                                  <AgendaEventCard
                                    event={event}
                                    isSelected={selectedEvent?.id === event.id}
                                    onSelect={() => setSelectedEvent(event)}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <EventDetailsPanel event={selectedEvent} />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm md:grid-cols-5">
            {eventTypeOptions
              .filter(
                (option): option is { value: AdminAgendaEventType; label: string } =>
                  option.value !== "todos",
              )
              .map((option) => {
                const styles = eventTypeStyles[option.value];

                return (
                  <div key={option.value} className={`rounded-md border px-2.5 py-1.5 ${styles.summary}`}>
                    <span className={`block text-lg font-semibold ${styles.text}`}>
                      {agenda.resumo.por_tipo[option.value]}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-normal uppercase text-zinc-500">
                      {eventTypeLabels[option.value]}
                    </span>
                  </div>
                );
              })}
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
              <span className="block text-lg font-semibold text-zinc-950">
                {agenda.resumo.total}
              </span>
              <span className="mt-0.5 block text-[10px] font-normal uppercase text-zinc-500">
                Total de eventos
              </span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}