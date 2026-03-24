import { useMemo } from "react";
import { mockSchools, mockContracts, mockEvents } from "@/data/mockData";
import {
  GraduationCap,
  CalendarDays,
  FileText,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Link } from "react-router-dom";

function KpiCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="surface-card p-5 flex items-start gap-4">
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
    </div>
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
        <KpiCard icon={GraduationCap} label="Actieve partnerschappen" value={activeSchools} />
        <KpiCard icon={CalendarDays} label="Evenementen dit jaar" value={eventsThisYear} />
        <KpiCard icon={TrendingUp} label="Komende 30 dagen" value={upcomingEvents.length} accent />
        <KpiCard icon={AlertTriangle} label="Contracten vervallen < 90d" value={expiringContracts.length} accent />
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
                <div key={ev.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{ev.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(ev.date).toLocaleDateString("nl-BE")} · {ev.location}
                    </p>
                  </div>
                  <StatusBadge status={ev.status} />
                </div>
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
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{school?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vervalt: {new Date(c.end_date).toLocaleDateString("nl-BE")} · {c.contract_type}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
