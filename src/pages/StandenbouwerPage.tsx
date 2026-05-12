import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTaken } from "@/hooks/useTaken";
import { useProfiles } from "@/hooks/useProfiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut, MapPin, Clock, Ruler, StickyNote, CalendarDays,
  ListTodo, ArrowUp, Minus, AlertTriangle, Hash, Car, Phone, User as UserIcon, Wrench,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/types/crm";

interface StandEvent {
  id: string;
  name: string;
  date: string;
  location: string | null;
  setup_time: string | null;
  setup_date: string | null;
  start_time: string | null;
  end_time: string | null;
  teardown_time: string | null;
  booth_size: string | null;
  booth_number: string | null;
  parking_info: string | null;
  description: string | null;
  contacts: { name: string; phone: string | null }[];
}

const priorityIcon: Record<string, React.ReactNode> = {
  hoog: <ArrowUp className="h-3.5 w-3.5 text-destructive" />,
  normaal: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
  laag: <ArrowUp className="h-3.5 w-3.5 text-info rotate-180" />,
};

function EventsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2"><Skeleton className="h-5 w-48" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function StandenbouwerPage() {
  const { logout, user } = useAuth();
  const { taken, upsertTask } = useTaken();
  const { resolveAssignee } = useProfiles();
  const [events, setEvents] = useState<StandEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("evenementen")
        .select("id, name, date, location, setup_date, setup_time, start_time, end_time, teardown_time, booth_size, booth_number, parking_info, description")
        .eq("requires_booth_builder", true)
        .order("date", { ascending: true });
      if (error || !data) { setLoading(false); return; }

      const ids = data.map((e: any) => e.id);
      const { data: cps } = ids.length
        ? await supabase
            .from("event_contactpersonen")
            .select("event_id, contact:contacten(name, phone)")
            .in("event_id", ids)
            .eq("rol", "event_ter_plaatse")
        : { data: [] as any[] };
      const contactsByEvent = new Map<string, { name: string; phone: string | null }[]>();
      (cps ?? []).forEach((row: any) => {
        if (!row.contact) return;
        const list = contactsByEvent.get(row.event_id) ?? [];
        list.push({ name: row.contact.name, phone: row.contact.phone });
        contactsByEvent.set(row.event_id, list);
      });

      setEvents(data.map((e: any) => ({ ...e, contacts: contactsByEvent.get(e.id) ?? [] })));
      setLoading(false);
    }
    load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const sortedEvents = useMemo(() => {
    const upcoming = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = events.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
    return [...upcoming, ...past];
  }, [events, today]);
  const now = useMemo(() => new Date(), []);
  const eventIds = useMemo(() => events.map((e) => e.id), [events]);

  const myTasks = useMemo(() => taken.filter((t) => {
    const assignedToMe = t.assigned_to === user?.id || t.assigned_to === user?.name;
    const linkedToEvent = t.event_id && eventIds.includes(t.event_id);
    return assignedToMe || linkedToEvent;
  }), [taken, user, eventIds]);

  const activeTasks = useMemo(() => myTasks.filter((t) => t.status !== "afgerond"), [myTasks]);
  const doneTasks = useMemo(() => myTasks.filter((t) => t.status === "afgerond"), [myTasks]);

  const toggleTaskStatus = useCallback(async (taskId: string) => {
    const task = taken.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus: TaskStatus = task.status === "afgerond" ? "open" : "afgerond";
    try {
      await upsertTask.mutateAsync({ ...task, status: newStatus });
    } catch {
      toast.error("Fout bij bijwerken taak.");
    }
  }, [taken, upsertTask]);

  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e.name])), [events]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">E</div>
          <span className="font-semibold text-sm">Elia Campus Events</span>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs text-muted-foreground hidden sm:inline">{user.name}</span>}
          <Button variant="outline" size="sm" onClick={logout} className="h-8 gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            Uitloggen
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Evenementen
            </TabsTrigger>
            <TabsTrigger value="taken" className="gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              Taken
              {activeTasks.length > 0 && (
                <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5 tabular-nums">
                  {activeTasks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Evenementen overzicht</h2>
            {loading ? (
              <EventsSkeleton />
            ) : sortedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen evenementen gevonden waar een standenbouwer nodig is.</p>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((ev) => (
                  <EventCard key={ev.id} ev={ev} past={ev.date < today} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="taken" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Mijn taken</h2>
            </div>

            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen taken gevonden.</p>
            ) : (
              <div className="space-y-4">
                {activeTasks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Openstaand ({activeTasks.length})</p>
                    {activeTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        now={now}
                        eventMap={eventMap}
                        resolveAssignee={resolveAssignee}
                        onToggle={toggleTaskStatus}
                      />
                    ))}
                  </div>
                )}
                {doneTasks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Afgerond ({doneTasks.length})</p>
                    {doneTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        now={now}
                        eventMap={eventMap}
                        resolveAssignee={resolveAssignee}
                        onToggle={toggleTaskStatus}
                        done
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const TaskRow = memo(function TaskRow({
  task, now, eventMap, resolveAssignee, onToggle, done = false,
}: {
  task: Task; now: Date; eventMap: Map<string, string>;
  resolveAssignee: (id: string | null | undefined) => string;
  onToggle: (id: string) => void; done?: boolean;
}) {
  const overdue = !done && task.due_date && new Date(task.due_date) < now;
  const eventName = task.event_id ? eventMap.get(task.event_id) : null;

  return (
    <div className={`surface-card p-3 sm:p-4 flex items-start gap-3 ${done ? "opacity-50" : ""}`}>
      <Checkbox
        checked={task.status === "afgerond"}
        onCheckedChange={() => onToggle(task.id)}
        className="mt-0.5 h-5 w-5"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
          <span className="inline-flex items-center gap-1 text-xs capitalize">
            {priorityIcon[task.priority]} {task.priority}
          </span>
          <span className="text-xs text-muted-foreground">{resolveAssignee(task.assigned_to)}</span>
          {task.due_date && (
            <span className={`text-xs tabular-nums ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {new Date(task.due_date).toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}
              {overdue && <AlertTriangle className="inline h-3 w-3 ml-1 -mt-0.5" />}
            </span>
          )}
          {eventName && (
            <span className="text-xs text-primary">{eventName}</span>
          )}
          <StatusBadge status={task.status} />
        </div>
      </div>
    </div>
  );
});

const Detail = memo(function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
});

function fmtTime(t: string | null | undefined) {
  if (!t) return null;
  return t.length > 5 ? t.slice(0, 5) : t;
}

const EventCard = memo(function EventCard({ ev, past }: { ev: StandEvent; past: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const start = fmtTime(ev.start_time);
  const end = fmtTime(ev.end_time);
  const setupT = fmtTime(ev.setup_time);
  const teardown = fmtTime(ev.teardown_time);
  const eventTime = start && end ? `${start} - ${end}` : start || end;
  const setupSameDay = !ev.setup_date || ev.setup_date === ev.date;
  const setupLabel = [!setupSameDay && ev.setup_date ? format(parseISO(ev.setup_date), "d MMM", { locale: nl }) : null, setupT]
    .filter(Boolean).join(" ");
  const desc = ev.description || "";
  const truncated = desc.length > 200;
  const shownDesc = expanded || !truncated ? desc : desc.slice(0, 200).trimEnd() + "…";

  return (
    <Card className={past ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{ev.name}</CardTitle>
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${past ? "text-muted-foreground bg-muted" : "text-primary bg-primary/10"}`}>
            {past ? "Afgelopen" : "Aankomend"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-2">
          <Detail icon={CalendarDays} label="Datum" value={format(parseISO(ev.date), "EEEE d MMMM yyyy", { locale: nl })} />
          <Detail icon={MapPin} label="Locatie" value={ev.location} />
          <Detail icon={Clock} label="Event" value={eventTime} />
          <Detail icon={Wrench} label="Opbouw" value={setupLabel || null} />
          <Detail icon={Wrench} label="Afbraak" value={teardown} />
          <Detail icon={Ruler} label="Standgrootte" value={ev.booth_size} />
          <Detail icon={Hash} label="Standnummer" value={ev.booth_number} />
          <Detail icon={Car} label="Parking" value={ev.parking_info} />
        </div>

        {ev.contacts.length > 0 && (
          <div className="border-l-2 border-primary/40 bg-primary/5 rounded-r-md px-3 py-2 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <UserIcon className="h-3 w-3" /> Contact ter plaatse
            </p>
            {ev.contacts.map((c, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-medium">{c.name}</span>
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Phone className="h-3 w-3" />{c.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {desc && (
          <div className="flex items-start gap-2 pt-1">
            <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {shownDesc}
              {truncated && (
                <button onClick={() => setExpanded((v) => !v)} className="ml-1 text-primary hover:underline">
                  {expanded ? "minder" : "meer lezen"}
                </button>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
