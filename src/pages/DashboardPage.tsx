import { useMemo, lazy, Suspense } from "react";
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
      className="surface-card p-5 flex items-start gap-4 cursor-pointer transition-[box-shadow,background-color] hover:shadow-md hover:bg-muted/30"
    >
      <div
        className={`flex items-center justify-center w-10 h-10 rounded ${
          accent ? "bg-accent/10" : "bg-primary/10"
        }`}
      >
        <Icon className={`h-5 w-5 ${accent ? "text-accent" : "text-primary"}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-0.5 tabular-nums">{value}</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const now = new Date();
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

  return (
    <div className="page-container animate-fade-in-up">
      <h1 className="mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={GraduationCap} label="Actieve partnerschappen" value={activeSchools} to="/scholen?status=actief" />
        <KpiCard icon={CalendarDays} label="Evenementen dit jaar" value={eventsThisYear} to="/evenementen?period=thisYear" />
        <KpiCard icon={TrendingUp} label="Komende 30 dagen" value={upcomingEvents.length} accent to="/evenementen?period=next30" />
        <KpiCard icon={AlertTriangle} label="Contracten vervallen < 90d" value={expiringContracts.length} accent to="/contracten?expiring=90" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming events */}
        <div className="surface-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2>Komende evenementen</h2>
            <Link to="/evenementen" className="text-sm text-primary hover:underline">
              Alles bekijken
            </Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingEvents.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Geen evenementen in de komende 30 dagen.</p>
            ) : (
              upcomingEvents.slice(0, 5).map((ev) => (
                <Link
                  key={ev.id}
                  to={`/evenementen/${ev.id}`}
                  className="p-4 flex items-center justify-between hover:bg-muted/30 transition-[background-color,box-shadow] hover:shadow-sm cursor-pointer block"
                >
                  <div>
                    <p className="text-sm font-medium">{ev.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(ev.date).toLocaleDateString("nl-BE")} · {ev.location}
                    </p>
                  </div>
                  <StatusBadge status={ev.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Expiring contracts */}
        <div className="surface-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2>Vervallende contracten</h2>
            <Link to="/contracten" className="text-sm text-primary hover:underline">
              Alles bekijken
            </Link>
          </div>
          <div className="divide-y divide-border">
            {expiringContracts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Geen contracten vervallen binnen 90 dagen.</p>
            ) : (
              expiringContracts.map((c) => {
                const school = mockSchools.find((s) => s.id === c.school_id);
                return (
                  <Link
                    key={c.id}
                    to={`/contracten`}
                    className="p-4 flex items-center justify-between hover:bg-muted/30 transition-[background-color,box-shadow] hover:shadow-sm cursor-pointer block"
                  >
                    <div>
                      <p className="text-sm font-medium">{school?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vervalt: {new Date(c.end_date).toLocaleDateString("nl-BE")} · {c.contract_type}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="surface-card h-[460px] animate-pulse mt-6" />}>
        <div className="mt-6">
          <BelgiumMap />
        </div>
      </Suspense>
    </div>
  );
}
