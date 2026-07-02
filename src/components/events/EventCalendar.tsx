import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Event } from "@/types/crm";

const DAY_NAMES = ["ma", "di", "wo", "do", "vr", "za", "zo"];

const STATUS_COLORS: Record<string, string> = {
  option: "bg-sky-400/15 text-sky-700 border-sky-400/25",
  gepland: "bg-blue-500/15 text-blue-700 border-blue-500/25",
  bevestigd: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  afgelopen: "bg-zinc-400/15 text-zinc-500 border-zinc-400/25",
  geannuleerd: "bg-red-500/15 text-red-500 border-red-500/25",
};

const STATUS_DOT: Record<string, string> = {
  option: "bg-sky-400",
  gepland: "bg-blue-500",
  bevestigd: "bg-emerald-500",
  afgelopen: "bg-zinc-400",
  geannuleerd: "bg-red-400",
};

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Monday=0 adjustment (JS: Sunday=0)
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const days: { date: Date; inMonth: boolean }[] = [];

  // Previous month padding
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), inMonth: false });
  }
  // Current month
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: new Date(year, month, d), inMonth: true });
  }
  // Next month padding to fill grid
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), inMonth: false });
    }
  }
  return days;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function EventChip({ event, compact }: { event: Event; compact?: boolean }) {
  const navigate = useNavigate();
  const colors = STATUS_COLORS[event.status] ?? STATUS_COLORS.gepland;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(`/evenementen/${event.id}`); }}
      className={`w-full text-left rounded border px-1.5 py-0.5 text-[11px] leading-tight font-medium truncate transition-opacity hover:opacity-80 active:scale-[0.97] ${colors} ${compact ? "text-[10px]" : ""}`}
      title={event.name}
    >
      {event.name}
    </button>
  );
}

const MAX_VISIBLE = 3;

interface EventCalendarProps {
  events: Event[];
}

export function EventCalendar({ events }: EventCalendarProps) {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach((ev) => {
      const key = ev.date; // YYYY-MM-DD from DB
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const todayKey = dateKey(today);
  const monthLabel = new Date(year, month).toLocaleDateString("nl-BE", { month: "long", year: "numeric" });

  // Mobile: events for selected day
  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-base sm:text-lg font-semibold capitalize ml-1">{monthLabel}</h2>
        </div>
        <Button variant="ghost" size="sm" className="text-xs" onClick={goToday}>
          Vandaag
        </Button>
      </div>

      {/* Desktop calendar grid */}
      <div className="hidden md:block surface-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_NAMES.map((d) => (
            <div key={d} className="px-2 py-2 text-xs font-medium text-muted-foreground text-center uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const key = dateKey(day.date);
            const isToday = key === todayKey;
            const dayEvents = eventsByDate[key] ?? [];
            const visible = dayEvents.slice(0, MAX_VISIBLE);
            const overflow = dayEvents.length - MAX_VISIBLE;

            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r border-border p-1.5 transition-colors ${
                  day.inMonth ? "" : "bg-muted/30"
                } ${isToday ? "bg-primary/5" : ""} ${
                  i % 7 === 0 ? "border-l-0" : ""
                }`}
              >
                <div className={`text-xs tabular-nums mb-1 ${
                  isToday
                    ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-semibold"
                    : day.inMonth
                      ? "text-foreground font-medium"
                      : "text-muted-foreground/50"
                }`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {visible.map((ev) => (
                    <EventChip key={ev.id} event={ev} />
                  ))}
                  {overflow > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full text-left text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/50 transition-colors">
                          +{overflow} meer
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 space-y-1" align="start">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          {day.date.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                        {dayEvents.map((ev) => (
                          <EventChip key={ev.id} event={ev} />
                        ))}
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile calendar */}
      <div className="md:hidden">
        {/* Compact month grid with dots */}
        <div className="surface-card p-3 mb-3">
          <div className="grid grid-cols-7 gap-0">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase py-1">
                {d}
              </div>
            ))}
            {days.map((day, i) => {
              const key = dateKey(day.date);
              const isToday = key === todayKey;
              const dayEvents = eventsByDate[key] ?? [];
              const isSelected = selectedDay === key;

              return (
                <button
                  key={i}
                  onClick={() => day.inMonth && setSelectedDay(isSelected ? null : key)}
                  className={`flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                    day.inMonth ? "hover:bg-muted/50" : "opacity-30"
                  } ${isSelected ? "bg-primary/10" : ""} ${isToday && !isSelected ? "bg-primary/5" : ""}`}
                  disabled={!day.inMonth}
                >
                  <span className={`text-xs tabular-nums ${
                    isToday
                      ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-semibold"
                      : day.inMonth ? "font-medium" : "text-muted-foreground/50"
                  }`}>
                    {day.date.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[ev.status] ?? STATUS_DOT.gepland}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day events */}
        {selectedDay && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {new Date(selectedDay + "T00:00:00").toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Geen events op deze dag.</p>
            ) : (
              selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="surface-card p-3 cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => navigate(`/evenementen/${ev.id}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{ev.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ev.start_time && `${ev.start_time.slice(0, 5)}`}
                        {ev.end_time && ` – ${ev.end_time.slice(0, 5)}`}
                        {ev.location && ` · ${ev.location}`}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[ev.status] ?? STATUS_COLORS.gepland}`}>
                      {ev.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
