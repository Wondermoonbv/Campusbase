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
  ListTodo, ArrowUp, Minus, AlertTriangle,
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
  opbouw_tijd: string | null;
  afbraak_tijd: string | null;
  stand_grootte: string | null;
  stand_notities: string | null;
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
        .select("id, name, date, location, opbouw_tijd, afbraak_tijd, stand_grootte, stand_notities")
        .eq("standenbouwer_nodig", true)
        .order("date", { ascending: true });
      if (!error && data) setEvents(data as StandEvent[]);
      setLoading(false);
    }
    load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
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
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen evenementen gevonden waar een standenbouwer nodig is.</p>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => {
                  const past = ev.date < today;
                  return (
                    <Card key={ev.id} className={past ? "opacity-50" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{ev.name}</CardTitle>
                          {past && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                              Afgelopen
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-2 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Detail icon={CalendarDays} label="Datum" value={format(parseISO(ev.date), "d MMMM yyyy", { locale: nl })} />
                          <Detail icon={MapPin} label="Locatie" value={ev.location} />
                          <Detail icon={Clock} label="Opbouwtijd" value={ev.opbouw_tijd} />
                          <Detail icon={Clock} label="Afbraaktijd" value={ev.afbraak_tijd} />
                          <Detail icon={Ruler} label="Standgrootte" value={ev.stand_grootte} />
                        </div>
                        {ev.stand_notities && (
                          <div className="flex gap-2 mt-1 pt-2 border-t border-border">
                            <StickyNote className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-muted-foreground text-xs leading-relaxed">{ev.stand_notities}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
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
