import { useMemo, useState, useCallback, useRef } from "react";
import { useScholen } from "@/hooks/useScholen";
import { AmbassadeurPrestaties } from "@/components/rapportage/AmbassadeurPrestaties";
import { EventFeedbackOverzicht } from "@/components/rapportage/EventFeedbackOverzicht";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useContracten } from "@/hooks/useContracten";
import { useEventOrganisaties } from "@/hooks/useEventOrganisaties";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download, GraduationCap, CalendarDays, Wallet, Users } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, getWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";
import { REGION_LABELS, TARGET_LEVEL_LABELS, REGISTRATION_TYPE_LABELS } from "@/lib/event-labels";
import { DeliverablesReportCards } from "@/components/rapportage/DeliverablesReports";

const CHART_COLORS = ["#0E6575", "#ef7c14", "#007BAF", "#0C8129", "#CD2E15", "#434f54", "#6366f1", "#ec4899"];
type PeriodPreset = "week" | "month" | "quarter" | "academic" | "custom";

function getAcademicYear(now: Date): [Date, Date] {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11
  const startYear = m >= 8 ? y : y - 1;
  return [new Date(startYear, 8, 1), new Date(startYear + 1, 7, 31, 23, 59, 59, 999)];
}

function getRange(preset: PeriodPreset, customFrom?: Date, customTo?: Date): [Date, Date] {
  const now = new Date();
  switch (preset) {
    case "week": return [startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })];
    case "month": return [startOfMonth(now), endOfMonth(now)];
    case "quarter": return [startOfQuarter(now), endOfQuarter(now)];
    case "academic": return getAcademicYear(now);
    case "custom": return [customFrom ?? startOfYear(now), customTo ?? endOfYear(now)];
  }
}

function exportChartPNG(chartRef: React.RefObject<HTMLDivElement>, filename: string) {
  const svg = chartRef.current?.querySelector("svg"); if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas"); const svgRect = svg.getBoundingClientRect();
  canvas.width = svgRect.width * 2; canvas.height = svgRect.height * 2;
  const ctx = canvas.getContext("2d")!; ctx.scale(2, 2);
  const img = new Image();
  img.onload = () => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); const a = document.createElement("a"); a.download = `${filename}.png`; a.href = canvas.toDataURL("image/png"); a.click(); writeAuditLog({ action: "export", entity_type: "export", entity_id: filename, entity_name: `Rapportage: ${filename}`, changes: { format: "png" } }); };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

function exportCSV(data: { name: string; value: number }[], filename: string) {
  const csv = "Label;Waarde\n" + data.map((d) => `${d.name};${d.value}`).join("\n");
  const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${filename}.csv`; a.click();
  writeAuditLog({ action: "export", entity_type: "export", entity_id: filename, entity_name: `Rapportage: ${filename}`, changes: { row_count: data.length, format: "csv" } });
}

function ChartCard({ title, children, data, chartId }: { title: string; children: React.ReactNode; data: { name: string; value: number }[]; chartId: string; }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4"><h2 className="text-sm sm:text-base font-semibold">{title}</h2><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportChartPNG(ref, chartId)} title="Export PNG"><Download className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportCSV(data, chartId)} title="Export CSV"><span className="text-[10px] font-bold">CSV</span></Button></div></div>
      <div ref={ref}>{children}</div>
    </div>
  );
}

export default function RapportagePage() {
  const { scholen } = useScholen();
  const { evenementen } = useEvenementen();
  const { contracten } = useContracten();
  const { links: eventOrgLinks } = useEventOrganisaties();
  const [preset, setPreset] = useState<PeriodPreset>("academic");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [eventGrouping, setEventGrouping] = useState<"week" | "month">("month");
  const [activeTab, setActiveTab] = useState("events");

  const [rangeStart, rangeEnd] = getRange(preset, customFrom, customTo);
  const inRange = useCallback((dateStr: string) => { const d = new Date(dateStr); return isWithinInterval(d, { start: rangeStart, end: rangeEnd }); }, [rangeStart, rangeEnd]);

  const filteredEvents = useMemo(() => evenementen.filter((e) => inRange(e.date)), [evenementen, inRange]);
  const filteredContracts = useMemo(() => contracten.filter((c) => { const start = new Date(c.start_date); const end = new Date(c.end_date); return start <= rangeEnd && end >= rangeStart; }), [contracten, rangeStart, rangeEnd]);
  const expiringContracts = useMemo(() => contracten.filter((c) => inRange(c.end_date) && c.status === "actief"), [contracten, inRange]);

  const totalEvents = filteredEvents.length;
  const totalBudget = filteredEvents.reduce((s, e) => s + (e.budget ?? 0), 0);
  const activeSchoolIds = new Set(filteredEvents.map((e) => e.organisator_id).filter(Boolean));

  const eventsTimeline = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredEvents.forEach((e) => { const d = new Date(e.date); const key = eventGrouping === "week" ? `W${getWeek(d, { weekStartsOn: 1 })}` : format(d, "MMM yyyy", { locale: nl }); groups[key] = (groups[key] || 0) + 1; });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [filteredEvents, eventGrouping]);

  const eventsByType = useMemo(() => { const c: Record<string, number> = {}; filteredEvents.forEach((e) => { c[e.type] = (c[e.type] || 0) + 1; }); return Object.entries(c).map(([name, value]) => ({ name, value })); }, [filteredEvents]);
  const eventsBySchool = useMemo(() => {
    const orgById = new Map(scholen.map((s) => [s.id, s]));
    const linksByEvent = new Map<string, string[]>();
    eventOrgLinks.forEach((l) => {
      const arr = linksByEvent.get(l.event_id) ?? [];
      arr.push(l.organisatie_id);
      linksByEvent.set(l.event_id, arr);
    });
    const counts: Record<string, number> = {};
    filteredEvents.forEach((e) => {
      const orgIds = linksByEvent.get(e.id) ?? [];
      const headIds = new Set<string>();
      orgIds.forEach((oid) => {
        const org = orgById.get(oid);
        if (!org) return;
        headIds.add(org.parent_id ?? org.id);
      });
      if (headIds.size === 0) {
        const name = e.organisator_id ? (orgById.get(e.organisator_id)?.name ?? "Onbekend") : "Multi-school";
        counts[name] = (counts[name] || 0) + 1;
        return;
      }
      headIds.forEach((hid) => {
        const name = orgById.get(hid)?.name ?? "Onbekend";
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredEvents, scholen, eventOrgLinks]);
  const budgetByType = useMemo(() => { const s: Record<string, number> = {}; filteredEvents.forEach((e) => { s[e.type] = (s[e.type] || 0) + (e.budget ?? 0); }); return Object.entries(s).map(([name, value]) => ({ name, value })); }, [filteredEvents]);
  const budgetBySchool = useMemo(() => {
    const orgById = new Map(scholen.map((s) => [s.id, s]));
    const s: Record<string, number> = {};
    filteredContracts
      .filter((c) => c.status === "actief")
      .forEach((c) => {
        const org = orgById.get(c.organisatie_id);
        const headId = org?.parent_id ?? c.organisatie_id;
        const name = orgById.get(headId)?.name ?? "Onbekend";
        s[name] = (s[name] || 0) + (c.value ?? 0);
      });
    return Object.entries(s).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredContracts, scholen]);
  const contractsByType = useMemo(() => { const s: Record<string, number> = {}; filteredContracts.forEach((c) => { s[c.contract_type] = (s[c.contract_type] || 0) + (c.value ?? 0); }); return Object.entries(s).map(([name, value]) => ({ name, value })); }, [filteredContracts]);
  const totalContractValue = filteredContracts.filter((c) => c.status === "actief").reduce((s, c) => s + (c.value ?? 0), 0);

  const eventsByRegio = useMemo(() => { const c: Record<string, number> = {}; filteredEvents.forEach((e) => { const key = e.region ? (REGION_LABELS[e.region] || e.region) : "Onbekend"; c[key] = (c[key] || 0) + 1; }); return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [filteredEvents]);
  const eventsByDoelgroep = useMemo(() => { const c: Record<string, number> = {}; filteredEvents.forEach((e) => { const key = e.target_level ? (TARGET_LEVEL_LABELS[e.target_level] || e.target_level) : "Onbekend"; c[key] = (c[key] || 0) + 1; }); return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [filteredEvents]);
  const eventsByRegistratie = useMemo(() => { const c: Record<string, number> = {}; filteredEvents.forEach((e) => { const key = e.registration_type ? (REGISTRATION_TYPE_LABELS[e.registration_type] || e.registration_type) : "Onbekend"; c[key] = (c[key] || 0) + 1; }); return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [filteredEvents]);


  return (
    <div className="page-container animate-fade-in-up">
      <h1 className="mb-4">Rapportage</h1>

      <div className="surface-card p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-sm font-medium text-muted-foreground w-full sm:w-auto">Periode:</span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">{(["week", "month", "quarter", "academic", "custom"] as PeriodPreset[]).map((p) => { const labels: Record<PeriodPreset, string> = { week: "Week", month: "Maand", quarter: "Kwartaal", academic: "Academiejaar", custom: "Aangepast" }; return <Button key={p} variant={preset === p ? "default" : "outline"} size="sm" className="h-9 sm:h-8 text-xs sm:text-sm" onClick={() => setPreset(p)}>{labels[p]}</Button>; })}</div>
          {preset === "custom" && (
            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-2">
              <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("justify-start text-left font-normal h-9 sm:h-8", !customFrom && "text-muted-foreground")}><CalendarIcon className="mr-1 h-3.5 w-3.5" />{customFrom ? format(customFrom, "dd/MM/yyyy") : "Van"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className={cn("p-3 pointer-events-auto")} /></PopoverContent></Popover>
              <span className="text-sm text-muted-foreground">→</span>
              <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("justify-start text-left font-normal h-9 sm:h-8", !customTo && "text-muted-foreground")}><CalendarIcon className="mr-1 h-3.5 w-3.5" />{customTo ? format(customTo, "dd/MM/yyyy") : "Tot"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={customTo} onSelect={setCustomTo} className={cn("p-3 pointer-events-auto")} /></PopoverContent></Popover>
            </div>
          )}
          <span className="text-xs text-muted-foreground w-full sm:w-auto sm:ml-auto">{preset === "academic" ? `Academiejaar ${rangeStart.getFullYear()}-${rangeEnd.getFullYear()}` : `${format(rangeStart, "dd/MM/yyyy")} — ${format(rangeEnd, "dd/MM/yyyy")}`}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {[{ icon: CalendarDays, label: "Totaal events", value: totalEvents }, { icon: Wallet, label: "Totaal budget", value: `€${totalBudget.toLocaleString("nl-BE")}` }, { icon: GraduationCap, label: "Actieve scholen", value: activeSchoolIds.size }, { icon: Users, label: "Studenten bereikt", value: 0 }].map((kpi) => (
          <div key={kpi.label} className="surface-card p-3 sm:p-4 flex items-start gap-2 sm:gap-3"><div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded bg-primary/10"><kpi.icon className="h-4 w-4 text-primary" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{kpi.label}</p><p className="text-lg sm:text-xl font-semibold tabular-nums">{kpi.value}</p></div></div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 sm:mb-6">
          <TabsTrigger value="events">Evenementen</TabsTrigger>
          <TabsTrigger value="contracts">Contracten & tegenprestaties</TabsTrigger>
          <TabsTrigger value="ambassadors">Ambassadeurs & feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <ChartCard title="Evenementen per periode" data={eventsTimeline} chartId="events-timeline">
              <div className="flex gap-1 mb-3"><Button variant={eventGrouping === "week" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setEventGrouping("week")}>Week</Button><Button variant={eventGrouping === "month" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setEventGrouping("month")}>Maand</Button></div>
              <ResponsiveContainer width="100%" height={220}><BarChart data={eventsTimeline}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} /><Tooltip /><Bar dataKey="value" fill="#0E6575" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Evenementen per type" data={eventsByType} chartId="events-type">
              <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={eventsByType} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" nameKey="name" label>{eventsByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Evenementen per hoofdorganisatie" data={eventsBySchool} chartId="events-school">
              <ResponsiveContainer width="100%" height={250}><BarChart data={eventsBySchool} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} /><Tooltip /><Bar dataKey="value" fill="#007BAF" radius={[0, 2, 2, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Evenementen per regio" data={eventsByRegio} chartId="events-regio">
              <ResponsiveContainer width="100%" height={250}><BarChart data={eventsByRegio} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9 }} /><Tooltip /><Bar dataKey="value" fill="#0C8129" radius={[0, 2, 2, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Evenementen per doelgroepniveau" data={eventsByDoelgroep} chartId="events-doelgroep">
              <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={eventsByDoelgroep} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" nameKey="name" label>{eventsByDoelgroep.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Evenementen per registratietype" data={eventsByRegistratie} chartId="events-registratie">
              <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={eventsByRegistratie} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" nameKey="name" label>{eventsByRegistratie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <ChartCard title="Contractwaarde per hoofdorganisatie (€)" data={budgetBySchool} chartId="budget-school">
              <ResponsiveContainer width="100%" height={250}><BarChart data={budgetBySchool} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v.toLocaleString()}`} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} /><Tooltip formatter={(v: number) => `€${v.toLocaleString("nl-BE")}`} /><Bar dataKey="value" fill="#0E6575" radius={[0, 2, 2, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Contractwaarde per type (€)" data={contractsByType} chartId="contracts-type">
              <div className="mb-3 text-sm text-muted-foreground">Totaal actieve contractwaarde: <span className="font-semibold text-foreground">€{totalContractValue.toLocaleString("nl-BE")}</span></div>
              <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={contractsByType} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: €${value.toLocaleString()}`}>{contractsByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => `€${v.toLocaleString("nl-BE")}`} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Budget per type event (€)" data={budgetByType} chartId="budget-type">
              <ResponsiveContainer width="100%" height={250}><BarChart data={budgetByType}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => `€${v.toLocaleString()}`} /><Tooltip formatter={(v: number) => `€${v.toLocaleString("nl-BE")}`} /><Bar dataKey="value" fill="#ef7c14" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <div className="surface-card p-4 sm:p-5">
              <h2 className="text-sm sm:text-base font-semibold mb-4">Contracten die vervallen in deze periode ({expiringContracts.length})</h2>
              {expiringContracts.length === 0 ? <p className="text-sm text-muted-foreground">Geen contracten vervallen in de geselecteerde periode.</p> : (
                <div className="divide-y divide-border">{expiringContracts.map((c) => { const school = scholen.find((s) => s.id === c.organisatie_id); return (<div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1"><div><p className="text-sm font-medium">{school?.name} — <span className="capitalize">{c.contract_type}</span></p><p className="text-xs text-muted-foreground">Vervalt: {new Date(c.end_date).toLocaleDateString("nl-BE")} · Waarde: {c.value ? `€${c.value.toLocaleString("nl-BE")}` : "—"}</p></div></div>); })}</div>
              )}
            </div>
            <DeliverablesReportCards rangeStart={rangeStart} rangeEnd={rangeEnd} />
          </div>
        </TabsContent>

        <TabsContent value="ambassadors" className="mt-0 space-y-4 sm:space-y-6">
          <AmbassadeurPrestaties />
          <EventFeedbackOverzicht />
        </TabsContent>
      </Tabs>
    </div>
  );
}
