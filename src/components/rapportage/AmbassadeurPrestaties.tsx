import { useMemo, useState } from "react";
import { useAmbassadeurs, useAllInschrijvingen } from "@/hooks/useAmbassadeurs";
import { useAllFeedbackData } from "@/hooks/useFeedback";
import { useEvenementen } from "@/hooks/useEvenementen";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, UserCheck, CalendarDays, MessageSquare } from "lucide-react";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";

function getAcademicYears(eventDates: string[]): string[] {
  const years = new Set<string>();
  eventDates.forEach((d) => {
    const date = new Date(d);
    const m = date.getMonth();
    const y = date.getFullYear();
    const startYear = m >= 8 ? y : y - 1;
    years.add(`${startYear}-${startYear + 1}`);
  });
  return Array.from(years).sort().reverse();
}

function isInAcademicYear(dateStr: string, academicYear: string): boolean {
  if (academicYear === "all") return true;
  const [startY] = academicYear.split("-").map(Number);
  const start = new Date(startY, 8, 1);
  const end = new Date(startY + 1, 7, 31);
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

interface AmbRow {
  id: string;
  name: string;
  confirmed: number;
  enrolled: number;
  feedback: number;
  ratio: number;
}

export function AmbassadeurPrestaties() {
  const { ambassadeurs } = useAmbassadeurs();
  const { inschrijvingen } = useAllInschrijvingen();
  const { forms, responses } = useAllFeedbackData();
  const { evenementen } = useEvenementen();

  const [academicYear, setAcademicYear] = useState("all");
  const { sort, toggleSort } = useSort("confirmed", "desc");

  const academicYears = useMemo(() => getAcademicYears(evenementen.map((e) => e.date)), [evenementen]);

  const eventIdsInRange = useMemo(() => {
    const ids = new Set<string>();
    evenementen.forEach((e) => { if (isInAcademicYear(e.date, academicYear)) ids.add(e.id); });
    return ids;
  }, [evenementen, academicYear]);

  const formEventMap = useMemo(() => {
    const m = new Map<string, string>();
    forms.forEach((f) => m.set(f.id, f.evenement_id));
    return m;
  }, [forms]);

  const eventIdsWithForms = useMemo(() => {
    const s = new Set<string>();
    forms.forEach((f) => { if (eventIdsInRange.has(f.evenement_id)) s.add(f.evenement_id); });
    return s;
  }, [forms, eventIdsInRange]);

  const rows: AmbRow[] = useMemo(() => {
    return ambassadeurs.map((amb) => {
      const ambInschr = inschrijvingen.filter(
        (i) => i.ambassadeur_id === amb.id && eventIdsInRange.has(i.evenement_id)
      );
      const confirmed = ambInschr.filter((i) => i.status === "bevestigd").length;
      const enrolled = ambInschr.filter((i) => i.status !== "afgemeld").length;
      const feedbackCount = responses.filter((r) => {
        const eventId = formEventMap.get(r.form_id);
        return eventId && eventIdsInRange.has(eventId) && r.respondent_email === amb.email;
      }).length;
      const confirmedWithForm = ambInschr.filter(
        (i) => i.status === "bevestigd" && eventIdsWithForms.has(i.evenement_id)
      ).length;
      const ratio = confirmedWithForm > 0 ? (feedbackCount / confirmedWithForm) * 100 : 0;
      return { id: amb.id, name: amb.full_name, confirmed, enrolled, feedback: feedbackCount, ratio };
    });
  }, [ambassadeurs, inschrijvingen, responses, eventIdsInRange, formEventMap, eventIdsWithForms]);

  const sorted = useMemo(() => {
    return sortItems(rows, sort, (item, key) => {
      if (key === "name") return item.name;
      return item[key as keyof AmbRow] as number;
    });
  }, [rows, sort]);

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.confirmed > 0 || r.enrolled > 0);
    const totalActive = active.length;
    const avgEvents = totalActive > 0 ? rows.reduce((s, r) => s + r.confirmed, 0) / totalActive : 0;
    const withFeedbackEligible = rows.filter((r) => r.confirmed > 0);
    const avgRatio = withFeedbackEligible.length > 0
      ? withFeedbackEligible.reduce((s, r) => s + r.ratio, 0) / withFeedbackEligible.length : 0;
    return { totalActive, avgEvents, avgRatio, totalAmbassadeurs: ambassadeurs.length };
  }, [rows, ambassadeurs]);

  const exportCSV = () => {
    const header = "Naam;Events deelgenomen;Events ingeschreven;Feedback ingevuld;Feedback ratio (%)";
    const lines = sorted.map((r) => `${r.name};${r.confirmed};${r.enrolled};${r.feedback};${r.ratio.toFixed(1)}`);
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `ambassadeur-prestaties-${academicYear}.csv`; a.click();
  };

  return (
    <div className="surface-card p-4 sm:p-5 mt-4 sm:mt-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> Ambassadeur prestaties
        </h2>
        <div className="flex items-center gap-2">
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle periodes</SelectItem>
              {academicYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: UserCheck, label: "Actieve ambassadeurs", value: totals.totalActive },
          { icon: CalendarDays, label: "Gem. events / ambassadeur", value: totals.avgEvents.toFixed(1) },
          { icon: MessageSquare, label: "Gem. feedback ratio", value: `${totals.avgRatio.toFixed(0)}%` },
        ].map((kpi) => (
          <div key={kpi.label} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10">
              <kpi.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
              <p className="text-lg font-semibold tabular-nums">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="name" currentSort={sort} onSort={toggleSort}>Naam</SortableTableHead>
              <SortableTableHead sortKey="confirmed" currentSort={sort} onSort={toggleSort} className="text-right">Deelgenomen</SortableTableHead>
              <SortableTableHead sortKey="enrolled" currentSort={sort} onSort={toggleSort} className="text-right">Ingeschreven</SortableTableHead>
              <SortableTableHead sortKey="feedback" currentSort={sort} onSort={toggleSort} className="text-right">Feedback</SortableTableHead>
              <SortableTableHead sortKey="ratio" currentSort={sort} onSort={toggleSort} className="text-right">Feedback ratio</SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">{r.name}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.confirmed}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.enrolled}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.feedback}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {r.confirmed > 0 ? `${r.ratio.toFixed(0)}%` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold text-sm">{totals.totalAmbassadeurs} ambassadeurs</TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-sm">ø {totals.avgEvents.toFixed(1)}</TableCell>
              <TableCell className="text-right text-sm">—</TableCell>
              <TableCell className="text-right text-sm">—</TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-sm">ø {totals.avgRatio.toFixed(0)}%</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
