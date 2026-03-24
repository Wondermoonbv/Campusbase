import { lazy, Suspense } from "react";
import { mockSchools, mockContracts, mockEvents, mockTasks } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";

const BelgiumMap = lazy(() => import("@/components/dashboard/BelgiumMap"));
import {
  GraduationCap,
  CalendarDays,
  FileText,
  AlertTriangle,
  TrendingUp,
  Users,
  CheckSquare,
  ArrowUp,
  Minus,
  Activity,
  BookOpen,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Link, useNavigate } from "react-router-dom";

function KpiCard({
  icon: Icon,
  label,
  value,
  accent = false,
  to,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: boolean;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="surface-card p-4 sm:p-5 flex items-start gap-3 sm:gap-4 cursor-pointer transition-[box-shadow,background-color] hover:shadow-md hover:bg-muted/30 active:scale-[0.98]"
    >
      <div className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded ${accent ? "bg-accent/10" : "bg-primary/10"}`}>
        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${accent ? "text-accent" : "text-primary"}`} />
      </div>
      <div>
        <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
        <p className="text-xl sm:text-2xl font-semibold mt-0.5 tabular-nums">{value}</p>
      </div>
    </Link>
  );
}


export default function DashboardPage() {
  const now = new Date();
  const { user } = useAuth();
  const in30Days = new Date(now.getTime() + 30 * 86400000);
  const in90Days = new Date(now.getTime() + 90 * 86400000);

  const activeSchools = mockSchools.filter((s) => s.status === "actief").length;
  const eventsThisYear = mockEvents.filter(
    (e) => new Date(e.date).getFullYear() === now.getFullYear()
  ).length;
  const upcomingEvents = mockEvents.filter((e) => {
    const d = new Date(e.date);
    return d >= now && d <= in30Days;
  });
  const expiringContracts = mockContracts.filter((c) => {
    const d = new Date(c.end_date);
    return d >= now && d <= in90Days && c.status === "actief";
  });

  const myTasks = mockTasks
    .filter((t) => t.status !== "afgerond")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  

  const priorityIcon: Record<string, React.ReactNode> = {
    hoog: <ArrowUp className="h-3 w-3 text-destructive" />,
    normaal: <Minus className="h-3 w-3 text-muted-foreground" />,
    laag: <ArrowUp className="h-3 w-3 text-info rotate-180" />,
  };

  return (
    <div className="page-container animate-fade-in-up">
      <h1 className="mb-4 sm:mb-6">Dashboard</h1>

      {/* KPI cards: 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <KpiCard icon={GraduationCap} label="Actieve partnerschappen" value={activeSchools} to="/scholen?status=actief" />
        <KpiCard icon={CalendarDays} label="Evenementen dit jaar" value={eventsThisYear} to="/evenementen?period=thisYear" />
        <KpiCard icon={TrendingUp} label="Komende 30 dagen" value={upcomingEvents.length} accent to="/evenementen?period=next30" />
        <KpiCard icon={AlertTriangle} label="Contracten vervallen < 90d" value={expiringContracts.length} accent to="/contracten?expiring=90" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Upcoming events */}
        <div className="surface-card">
          <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base">Komende evenementen</h2>
            <Link to="/evenementen" className="text-sm text-primary hover:underline">Alles bekijken</Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingEvents.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Geen evenementen in de komende 30 dagen.</p>
            ) : (
              upcomingEvents.slice(0, 5).map((ev) => (
                <Link key={ev.id} to={`/evenementen/${ev.id}`} className="p-3 sm:p-4 flex items-center justify-between hover:bg-muted/30 transition-[background-color,box-shadow] hover:shadow-sm cursor-pointer block active:scale-[0.99]">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium truncate">{ev.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(ev.date).toLocaleDateString("nl-BE")} · {ev.location}</p>
                  </div>
                  <StatusBadge status={ev.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Expiring contracts */}
        <div className="surface-card">
          <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base">Vervallende contracten</h2>
            <Link to="/contracten" className="text-sm text-primary hover:underline">Alles bekijken</Link>
          </div>
          <div className="divide-y divide-border">
            {expiringContracts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Geen contracten vervallen binnen 90 dagen.</p>
            ) : (
              expiringContracts.map((c) => {
                const school = mockSchools.find((s) => s.id === c.school_id);
                return (
                  <Link key={c.id} to="/contracten" className="p-3 sm:p-4 flex items-center justify-between hover:bg-muted/30 transition-[background-color,box-shadow] hover:shadow-sm cursor-pointer block active:scale-[0.99]">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-medium truncate">{school?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Vervalt: {new Date(c.end_date).toLocaleDateString("nl-BE")} · {c.contract_type}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 sm:mt-6">
        {/* My tasks widget */}
        <div className="surface-card">
          <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4 text-primary" /> Mijn taken
            </h2>
            <Link to="/taken" className="text-sm text-primary hover:underline">Alles bekijken</Link>
          </div>
          <div className="divide-y divide-border">
            {myTasks.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Geen openstaande taken.</p>
            ) : (
              myTasks.map((task) => {
                const overdue = new Date(task.due_date) < now;
                return (
                  <Link key={task.id} to="/taken" className="p-3 sm:p-4 flex items-center justify-between hover:bg-muted/30 transition-[background-color,box-shadow] hover:shadow-sm cursor-pointer block active:scale-[0.99]">
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                      <span>{priorityIcon[task.priority]}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {task.assigned_to} · <span className={overdue ? "text-destructive font-medium" : ""}>{new Date(task.due_date).toLocaleDateString("nl-BE")}{overdue && " (verlopen)"}</span>
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={task.status} />
                  </Link>
                );
              })
            )}
          </div>
        </div>

      </div>

      <Suspense fallback={<div className="surface-card h-[280px] sm:h-[400px] animate-pulse mt-4 sm:mt-6" />}>
        <div className="mt-4 sm:mt-6">
          <BelgiumMap />
        </div>
      </Suspense>
    </div>
  );
}
