import { useMemo, useState, useCallback, useRef } from "react";
import { useScholen } from "@/hooks/useScholen";
import { AmbassadeurPrestaties } from "@/components/rapportage/AmbassadeurPrestaties";
import { EventFeedbackOverzicht } from "@/components/rapportage/EventFeedbackOverzicht";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useContracten } from "@/hooks/useContracten";
import { useAllFeedbackData } from "@/hooks/useFeedback";
import { useAmbassadeurs, useAllInschrijvingen } from "@/hooks/useAmbassadeurs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download, GraduationCap, CalendarDays, Wallet, Users, Star, UserCheck } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, getWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#0E6575", "#ef7c14", "#007BAF", "#0C8129", "#CD2E15", "#434f54", "#6366f1", "#ec4899"];
type PeriodPreset = "week" | "month" | "quarter" | "year" | "custom";

function getRange(preset: PeriodPreset, customFrom?: Date, customTo?: Date): [Date, Date] {
  const now = new Date();
  switch (preset) {
    case "week": return [startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })];
    case "month": return [startOfMonth(now), endOfMonth(now)];
    case "quarter": return [startOfQuarter(now), endOfQuarter(now)];
    case "year": return [startOfYear(now), endOfYear(now)];
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
  img.onload = () => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); const a = document.createElement("a"); a.download = `${filename}.png`; a.href = canvas.toDataURL("image/png"); a.click(); };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

function exportCSV(data: { name: string; value: number }[], filename: string) {
  const csv = "Label;Waarde\n" + data.map((d) => `${d.name};${d.value}`).join("\n");
  const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${filename}.csv`; a.click();
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
  const { forms: feedbackForms, responses: feedbackResponses } = useAllFeedbackData();
  const { ambassadeurs } = useAmbassadeurs();
  const { inschrijvingen: allInschrijvingen } = useAllInschrijvingen();
  const [preset, setPreset] = useState<PeriodPreset>("year");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [eventGrouping, setEventGrouping] = useState<"week" | "month">("month");

  const [rangeStart, rangeEnd] = getRange(preset, customFrom, customTo);
  const inRange = useCallback((dateStr: string) => { const d = new Date(dateStr); return isWithinInterval(d, { start: rangeStart, end: rangeEnd }); }, [rangeStart, rangeEnd]);

  const filteredEvents = useMemo(() => evenementen.filter((e) => inRange(e.date)), [evenementen, inRange]);
  const filteredContracts = useMemo(() => contracten.filter((c) => { const start = new Date(c.start_date); const end = new Date(c.end_date); return start <= rangeEnd && end >= rangeStart; }), [contracten, rangeStart, rangeEnd]);
  const expiringContracts = useMemo(() => contracten.filter((c) => inRange(c.end_date) && c.status === "actief"), [contracten, inRange]);

  const totalEvents = filteredEvents.length;
  const totalBudget = filteredEvents.reduce((s, e) => s + (e.budget ?? 0), 0);
  const activeSchoolIds = new Set(filteredEvents.map((e) => e.school_id).filter(Boolean));

  const eventsTimeline = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredEvents.forEach((e) => { const d = new Date(e.date); const key = eventGrouping === "week" ? `W${getWeek(d, { weekStartsOn: 1 })}` : format(d, "MMM yyyy", { locale: nl }); groups[key] = (groups[key] || 0) + 1; });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [filteredEvents, eventGrouping]);

  const eventsByType = useMemo(() => { const c: Record<string, number> = {}; filteredEvents.forEach((e) => { c[e.type] = (c[e.type] || 0) + 1; }); return Object.entries(c).map(([name, value]) => ({ name, value })); }, [filteredEvents]);
  const eventsBySchool = useMemo(() => { const c: Record<string, number> = {}; filteredEvents.forEach((e) => { const name = e.school_id ? (scholen.find((s) => s.id === e.school_id)?.name ?? "Onbekend") : "Multi-school"; c[name] = (c[name] || 0) + 1; }); return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [filteredEvents, scholen]);
  const budgetByType = useMemo(() => { const s: Record<string, number> = {}; filteredEvents.forEach((e) => { s[e.type] = (s[e.type] || 0) + (e.budget ?? 0); }); return Object.entries(s).map(([name, value]) => ({ name, value })); }, [filteredEvents]);
  const budgetBySchool = useMemo(() => { const s: Record<string, number> = {}; filteredEvents.forEach((e) => { const name = e.school_id ? (scholen.find((sc) => sc.id === e.school_id)?.name ?? "Onbekend") : "Multi-school"; s[name] = (s[name] || 0) + (e.budget ?? 0); }); return Object.entries(s).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [filteredEvents, scholen]);
  const contractsByType = useMemo(() => { const s: Record<string, number> = {}; filteredContracts.forEach((c) => { s[c.contract_type] = (s[c.contract_type] || 0) + (c.value ?? 0); }); return Object.entries(s).map(([name, value]) => ({ name, value })); }, [filteredContracts]);
  const totalContractValue = filteredContracts.filter((c) => c.status === "actief").reduce((s, c) => s + (c.value ?? 0), 0);

  const feedbackByEvent = useMemo(() => {
    return feedbackForms
      .map((f) => {
        const event = evenementen.find((e) => e.id === f.evenement_id);
        if (!event) return null;
        const resps = feedbackResponses.filter((r) => r.form_id === f.id);
        if (resps.length === 0) return null;
        const avgOverall = resps.reduce((s, r) => s + (r.overall_rating ?? 0), 0) / resps.length;
        return { event, responseCount: resps.length, avgOverall };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.event.date).getTime() - new Date(a!.event.date).getTime()) as {
      event: typeof evenementen[0];
      responseCount: number;
      avgOverall: number;
    }[];
  }, [feedbackForms, feedbackResponses, evenementen]);

  const totalFeedbackAvg = feedbackByEvent.length
    ? feedbackByEvent.reduce((s, f) => s + f.avgOverall, 0) / feedbackByEvent.length
    : 0;

  return (
    <div className="page-container animate-fade-in-up">
      <h1 className="mb-4">Rapportage</h1>
      <div className="surface-card p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-sm font-medium text-muted-foreground w-full sm:w-auto">Periode:</span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">{(["week", "month", "quarter", "year", "custom"] as PeriodPreset[]).map((p) => { const labels: Record<PeriodPreset, string> = { week: "Week", month: "Maand", quarter: "Kwartaal", year: "Jaar", custom: "Aangepast" }; return <Button key={p} variant={preset === p ? "default" : "outline"} size="sm" className="h-9 sm:h-8 text-xs sm:text-sm" onClick={() => setPreset(p)}>{labels[p]}</Button>; })}</div>
          {preset === "custom" && (
            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-2">
              <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("justify-start text-left font-normal h-9 sm:h-8", !customFrom && "text-muted-foreground")}><CalendarIcon className="mr-1 h-3.5 w-3.5" />{customFrom ? format(customFrom, "dd/MM/yyyy") : "Van"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className={cn("p-3 pointer-events-auto")} /></PopoverContent></Popover>
              <span className="text-sm text-muted-foreground">→</span>
              <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("justify-start text-left font-normal h-9 sm:h-8", !customTo && "text-muted-foreground")}><CalendarIcon className="mr-1 h-3.5 w-3.5" />{customTo ? format(customTo, "dd/MM/yyyy") : "Tot"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={customTo} onSelect={setCustomTo} className={cn("p-3 pointer-events-auto")} /></PopoverContent></Popover>
            </div>
          )}
          <span className="text-xs text-muted-foreground w-full sm:w-auto sm:ml-auto">{format(rangeStart, "dd/MM/yyyy")} — {format(rangeEnd, "dd/MM/yyyy")}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {[{ icon: CalendarDays, label: "Totaal events", value: totalEvents }, { icon: Wallet, label: "Totaal budget", value: `€${totalBudget.toLocaleString("nl-BE")}` }, { icon: GraduationCap, label: "Actieve scholen", value: activeSchoolIds.size }, { icon: Users, label: "Studenten bereikt", value: 0 }].map((kpi) => (
          <div key={kpi.label} className="surface-card p-3 sm:p-4 flex items-start gap-2 sm:gap-3"><div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded bg-primary/10"><kpi.icon className="h-4 w-4 text-primary" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{kpi.label}</p><p className="text-lg sm:text-xl font-semibold tabular-nums">{kpi.value}</p></div></div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard title="Evenementen per periode" data={eventsTimeline} chartId="events-timeline">
          <div className="flex gap-1 mb-3"><Button variant={eventGrouping === "week" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setEventGrouping("week")}>Week</Button><Button variant={eventGrouping === "month" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setEventGrouping("month")}>Maand</Button></div>
          <ResponsiveContainer width="100%" height={220}><BarChart data={eventsTimeline}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} /><Tooltip /><Bar dataKey="value" fill="#0E6575" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Evenementen per type" data={eventsByType} chartId="events-type">
          <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={eventsByType} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" nameKey="name" label>{eventsByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Evenementen per school" data={eventsBySchool} chartId="events-school">
          <ResponsiveContainer width="100%" height={250}><BarChart data={eventsBySchool} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} /><Tooltip /><Bar dataKey="value" fill="#007BAF" radius={[0, 2, 2, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Budget per type event (€)" data={budgetByType} chartId="budget-type">
          <ResponsiveContainer width="100%" height={250}><BarChart data={budgetByType}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => `€${v.toLocaleString()}`} /><Tooltip formatter={(v: number) => `€${v.toLocaleString("nl-BE")}`} /><Bar dataKey="value" fill="#ef7c14" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Budget per school (€)" data={budgetBySchool} chartId="budget-school">
          <ResponsiveContainer width="100%" height={250}><BarChart data={budgetBySchool} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v.toLocaleString()}`} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} /><Tooltip formatter={(v: number) => `€${v.toLocaleString("nl-BE")}`} /><Bar dataKey="value" fill="#0E6575" radius={[0, 2, 2, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Contractwaarde per type (€)" data={contractsByType} chartId="contracts-type">
          <div className="mb-3 text-sm text-muted-foreground">Totaal actieve contractwaarde: <span className="font-semibold text-foreground">€{totalContractValue.toLocaleString("nl-BE")}</span></div>
          <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={contractsByType} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: €${value.toLocaleString()}`}>{contractsByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => `€${v.toLocaleString("nl-BE")}`} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer>
        </ChartCard>
        <div className="surface-card p-4 sm:p-5 lg:col-span-2">
          <h2 className="text-sm sm:text-base font-semibold mb-4">Contracten die vervallen in deze periode ({expiringContracts.length})</h2>
          {expiringContracts.length === 0 ? <p className="text-sm text-muted-foreground">Geen contracten vervallen in de geselecteerde periode.</p> : (
            <div className="divide-y divide-border">{expiringContracts.map((c) => { const school = scholen.find((s) => s.id === c.school_id); return (<div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1"><div><p className="text-sm font-medium">{school?.name} — <span className="capitalize">{c.contract_type}</span></p><p className="text-xs text-muted-foreground">Vervalt: {new Date(c.end_date).toLocaleDateString("nl-BE")} · Waarde: {c.value ? `€${c.value.toLocaleString("nl-BE")}` : "—"}</p></div></div>); })}</div>
          )}
        </div>
      </div>


      <AmbassadeurPrestaties />
      <EventFeedbackOverzicht />
