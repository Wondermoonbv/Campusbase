import { lazy, Suspense, useMemo } from "react";
import { useScholen } from "@/hooks/useScholen";
import { useContracten } from "@/hooks/useContracten";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useTaken } from "@/hooks/useTaken";
import { useAmbassadeurs, useAllInschrijvingen } from "@/hooks/useAmbassadeurs";
import { useAllFeedbackData } from "@/hooks/useFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useRecentActivity, type ActivityItem } from "@/hooks/useRecentActivity";

const BelgiumMap = lazy(() => import("@/components/dashboard/BelgiumMap"));
import {
  GraduationCap, CalendarDays, ListTodo, Users, ArrowUp, Minus,
  TrendingUp, Star, BarChart3, Clock, CalendarPlus, ClipboardList,
  UserPlus, MessageSquare, Calendar,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/* ── helpers ── */
function academicYearStart(date: Date): Date {
  const y = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(y, 8, 1); // September 1
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "zojuist";
  if (mins < 60) return `${mins} min geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}u geleden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "gisteren";
  return `${days}d geleden`;
}

/* ── KPI Card ── */
function KpiCard({ icon: Icon, label, value, to }: {
  icon: React.ElementType; label: string; value: string | number; to: string;
}) {
  return (
    <Link to={to} className="surface-card p-4 sm:p-5 flex items-start gap-3 sm:gap-4 cursor-pointer transition-[box-shadow,background-color] duration-200 hover:shadow-md hover:bg-muted/30 active:scale-[0.98]">
      <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
        <p className="text-xl sm:text-2xl font-semibold mt-0.5 tabular-nums">{value}</p>
      </div>
    </Link>
  );
}

/* ── Empty state ── */
function EmptyState({ icon: Icon, message, actionLabel, actionTo }: {
  icon: React.ElementType; message: string; actionLabel?: string; actionTo?: string;
}) {
  return (
    <div className="py-8 flex flex-col items-center gap-3">
      <Icon className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {actionLabel && actionTo && (
        <Button variant="outline" size="sm" asChild>
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const { user } = useAuth();
  const { effectiveRole, effectiveCanEdit } = useViewAs();
  const { scholen } = useScholen();
  const { contracten } = useContracten();
  const { evenementen } = useEvenementen();
  const { taken } = useTaken();
  const { ambassadeurs } = useAmbassadeurs();
  const { inschrijvingen } = useAllInschrijvingen();
  const { forms, responses } = useAllFeedbackData();
  const { data: recentActivities = [] } = useRecentActivity();

  const firstName = user?.firstName || user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "";

  /* ── KPI data ── */
  const activeSchools = scholen.filter((s) => s.status === "actief").length;
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const eventsThisMonth = evenementen.filter((e) => {
    const d = new Date(e.date);
    return d >= now && d <= endOfMonth;
  }).length;
  const openTasks = taken.filter((t) => t.status !== "afgerond").length;
  const activeAmbassadeurs = ambassadeurs.filter((a) => a.is_active).length;

  /* ── Upcoming events (next 5) ── */
  const upcomingEvents = useMemo(() => {
    return evenementen
      .filter((e) => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [evenementen, now]);

  /* ── Enriched upcoming events with ambassador count & feedback ── */
  const enrichedEvents = useMemo(() => {
    return upcomingEvents.map((ev) => {
      const confirmedCount = inschrijvingen.filter(
        (i) => i.evenement_id === ev.id && i.status === "bevestigd"
      ).length;
      const form = forms.find((f) => f.evenement_id === ev.id);
      const eventResponses = form ? responses.filter((r) => r.form_id === form.id) : [];
      const avgRating = eventResponses.length > 0
        ? eventResponses.reduce((sum, r) => sum + (r.overall_rating ?? 0), 0) / eventResponses.length
        : null;
      const schoolName = ev.school_id ? scholen.find((s) => s.id === ev.school_id)?.name : null;
      return { ...ev, confirmedCount, avgRating, schoolName };
    });
  }, [upcomingEvents, inschrijvingen, forms, responses, scholen]);

  /* ── Event performance (academic year) ── */
  const academicStart = academicYearStart(now);
  const eventsPerf = useMemo(() => {
    const academicEvents = evenementen.filter((e) => new Date(e.date) >= academicStart);
    const totalEvents = academicEvents.length;

    // Average ambassadors per event
    const eventAmbCounts = academicEvents.map((ev) =>
      inschrijvingen.filter((i) => i.evenement_id === ev.id && i.status === "bevestigd").length
    );
    const avgAmb = totalEvents > 0
      ? (eventAmbCounts.reduce((s, c) => s + c, 0) / totalEvents).toFixed(1)
      : "–";

    // Average feedback score
    const allEventForms = forms.filter((f) =>
      academicEvents.some((ev) => ev.id === f.evenement_id)
    );
    const allResponses = responses.filter((r) => allEventForms.some((f) => f.id === r.form_id));
    const avgFeedback = allResponses.length > 0
      ? (allResponses.reduce((s, r) => s + (r.overall_rating ?? 0), 0) / allResponses.length).toFixed(1)
      : "–";

    return { totalEvents, avgAmb, avgFeedback };
  }, [evenementen, inschrijvingen, forms, responses, academicStart]);

  /* ── My tasks ── */
  const myTasks = useMemo(() => {
    const userName = user?.name || "";
    return taken
      .filter((t) => t.status !== "afgerond" && t.assigned_to === userName)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5);
  }, [taken, user]);

  const priorityIcon: Record<string, React.ReactNode> = {
    hoog: <ArrowUp className="h-3.5 w-3.5 text-destructive" />,
    normaal: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
    laag: <ArrowUp className="h-3.5 w-3.5 text-info rotate-180" />,
  };

  /* ── Recent activity ── */
  const recentActivities = activities.slice(0, 5);

  /* ── Role-based sections ── */
  const showKpis = effectiveRole === "admin" || effectiveRole === "editor";
  const showTasks = effectiveRole === "admin" || effectiveRole === "editor";
  const showActivity = effectiveRole === "admin" || effectiveRole === "editor";
  const showPerformance = effectiveRole !== "standenbouwer";
  const showEvents = effectiveRole !== "standenbouwer";

  return (
    <div className="page-container animate-fade-in-up">
      {/* Welcome */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ lineHeight: "1.15" }}>
          Welkom{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {now.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI cards */}
      {showKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <KpiCard icon={GraduationCap} label="Actieve scholen" value={activeSchools} to="/scholen?status=actief" />
          <KpiCard icon={CalendarDays} label="Events deze maand" value={eventsThisMonth} to="/evenementen" />
          <KpiCard icon={ListTodo} label="Openstaande taken" value={openTasks} to="/taken" />
          <KpiCard icon={Users} label="Actieve ambassadeurs" value={activeAmbassadeurs} to="/ambassadeurs" />
        </div>
      )}

      {/* Main grid: left = events + performance, right = tasks + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Upcoming events */}
          {showEvents && (
            <div className="surface-card">
              <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-medium">Aankomende events</h2>
                <Link to="/evenementen" className="text-sm text-primary hover:underline">Alles bekijken</Link>
              </div>
              <div className="divide-y divide-border">
                {enrichedEvents.length === 0 ? (
                  <EmptyState
                    icon={CalendarPlus}
                    message="Geen aankomende events gepland."
                    actionLabel={effectiveCanEdit ? "Plan een event" : undefined}
                    actionTo={effectiveCanEdit ? "/evenementen" : undefined}
                  />
                ) : (
                  enrichedEvents.map((ev) => (
                    <Link key={ev.id} to={`/evenementen/${ev.id}`} className="p-3 sm:p-4 flex items-center justify-between hover:bg-muted/30 transition-[background-color] duration-150 cursor-pointer block active:scale-[0.99]">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-sm font-medium truncate">{ev.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(ev.date).toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}
                          {ev.location ? ` · ${ev.location}` : ""}
                          {ev.schoolName ? ` · ${ev.schoolName}` : ""}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {ev.confirmedCount > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" /> {ev.confirmedCount} bevestigd
                            </span>
                          )}
                          {ev.avgRating !== null && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Star className="h-3 w-3" /> {ev.avgRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={ev.status} />
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Event performance */}
          {showPerformance && (
            <div className="surface-card p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-base font-medium">Event performance</h2>
                <span className="text-xs text-muted-foreground ml-auto">Academiejaar {academicStart.getFullYear()}/{academicStart.getFullYear() + 1}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums">{eventsPerf.totalEvents}</p>
                  <p className="text-xs text-muted-foreground mt-1">Events</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums">{eventsPerf.avgAmb}</p>
                  <p className="text-xs text-muted-foreground mt-1">Gem. ambassadeurs</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-semibold tabular-nums">{eventsPerf.avgFeedback}</p>
                    {eventsPerf.avgFeedback !== "–" && <Star className="h-4 w-4 text-accent fill-accent" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Gem. feedback</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-6">
          {/* My tasks */}
          {showTasks && (
            <div className="surface-card">
              <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-medium flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary" /> Mijn taken
                </h2>
                <Link to="/taken" className="text-sm text-primary hover:underline">Alles bekijken</Link>
              </div>
              <div className="divide-y divide-border">
                {myTasks.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    message="Geen openstaande taken."
                    actionLabel={effectiveCanEdit ? "Maak een taak aan" : undefined}
                    actionTo={effectiveCanEdit ? "/taken" : undefined}
                  />
                ) : (
                  myTasks.map((task) => {
                    const overdue = task.due_date && new Date(task.due_date) < now;
                    return (
                      <Link key={task.id} to="/taken" className="p-3 sm:p-4 flex items-center justify-between hover:bg-muted/30 transition-[background-color] duration-150 cursor-pointer block active:scale-[0.99]">
                        <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                          <span className="shrink-0">{priorityIcon[task.priority]}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            <p className="text-xs mt-0.5">
                              <span className={overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                                {task.due_date ? new Date(task.due_date).toLocaleDateString("nl-BE", { day: "numeric", month: "short" }) : "Geen deadline"}
                                {overdue && " (verlopen)"}
                              </span>
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={task.priority} />
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Activity feed */}
          {showActivity && (
            <div className="surface-card">
              <div className="p-3 sm:p-4 border-b border-border">
                <h2 className="text-base font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Recente activiteit
                </h2>
              </div>
              <div className="divide-y divide-border">
                {recentActivities.length === 0 ? (
                  <EmptyState icon={Clock} message="Nog geen activiteiten geregistreerd." />
                ) : (
                  recentActivities.map((a) => (
                    <div key={a.id} className="p-3 sm:p-4">
                      <p className="text-sm">
                        <span className="font-medium">{a.userName}</span>{" "}
                        <span className="text-muted-foreground">heeft</span>{" "}
                        <span className="font-medium">{a.entityName}</span>{" "}
                        <span className="text-muted-foreground">{a.action}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(a.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <Suspense fallback={<div className="surface-card h-[280px] sm:h-[400px] animate-pulse mt-4 sm:mt-6" />}>
        <div className="mt-4 sm:mt-6">
          <BelgiumMap />
        </div>
      </Suspense>
    </div>
  );
}
