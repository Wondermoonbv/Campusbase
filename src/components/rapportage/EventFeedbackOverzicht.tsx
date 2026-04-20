import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useAllFeedbackData } from "@/hooks/useFeedback";
import { useAllInschrijvingen } from "@/hooks/useAmbassadeurs";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Star, MessageSquare, TrendingUp } from "lucide-react";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";
import { Progress } from "@/components/ui/progress";

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

function avgNums(nums: (number | null)[]): number {
  const valid = nums.filter((n): n is number => n != null);
  return valid.length > 0 ? valid.reduce((s, n) => s + n, 0) / valid.length : 0;
}

interface EventRow {
  eventId: string;
  name: string;
  date: string;
  confirmed: number;
  responses: number;
  responseRate: number;
  audience: number;
  conversation: number;
  awareness: number;
  interest: number;
  effort: number;
  participate: number;
}

function ScoreBar({ value, max = 5 }: { value: number; max?: number }) {
  if (value === 0) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <Progress value={(value / max) * 100} className="h-1.5 flex-1" />
      <span className="text-xs tabular-nums font-medium w-10 text-right">{value.toFixed(1)}/{max}</span>
    </div>
  );
}

export function EventFeedbackOverzicht() {
  const navigate = useNavigate();
  const { evenementen } = useEvenementen();
  const { forms, responses } = useAllFeedbackData();
  const { inschrijvingen } = useAllInschrijvingen();

  const [academicYear, setAcademicYear] = useState("all");
  const { sort, toggleSort } = useSort("date", "desc");

  const academicYears = useMemo(() => getAcademicYears(evenementen.map((e) => e.date)), [evenementen]);

  const rows: EventRow[] = useMemo(() => {
    return forms
      .map((f) => {
        const event = evenementen.find((e) => e.id === f.evenement_id);
        if (!event || !isInAcademicYear(event.date, academicYear)) return null;
        const resps = responses.filter((r) => r.form_id === f.id);
        const confirmed = inschrijvingen.filter(
          (i) => i.evenement_id === event.id && i.status === "bevestigd"
        ).length;
        const responseRate = confirmed > 0 ? (resps.length / confirmed) * 100 : 0;
        return {
          eventId: event.id, name: event.name, date: event.date, confirmed,
          responses: resps.length, responseRate,
          audience: avgNums(resps.map((r) => r.audience_relevance)),
          conversation: avgNums(resps.map((r) => r.conversation_quality)),
          awareness: avgNums(resps.map((r) => r.employer_awareness)),
          interest: avgNums(resps.map((r) => r.interest_level)),
          effort: avgNums(resps.map((r) => r.effort_vs_return)),
          participate: avgNums(resps.map((r) => r.participate_again)),
        };
      })
      .filter(Boolean) as EventRow[];
  }, [forms, evenementen, responses, inschrijvingen, academicYear]);

  const sorted = useMemo(() => {
    return sortItems(rows, sort, (item, key) => {
      if (key === "name") return item.name;
      if (key === "date") return new Date(item.date).getTime();
      return item[key as keyof EventRow] as number;
    });
  }, [rows, sort]);

  const totals = useMemo(() => {
    const withResponses = rows.filter((r) => r.responses > 0);
    return {
      totalResponses: rows.reduce((s, r) => s + r.responses, 0),
      avgParticipate: withResponses.length > 0 ? withResponses.reduce((s, r) => s + r.participate, 0) / withResponses.length : 0,
      avgResponseRate: rows.length > 0 ? rows.reduce((s, r) => s + r.responseRate, 0) / rows.length : 0,
    };
  }, [rows]);

  const exportCSV = () => {
    const header = "Event;Datum;Bevestigd;Responses;Response rate (%);Relevantie publiek;Kwaliteit gesprekken;Bekendheid Elia;Interesse;Effort/Return;Opnieuw deelnemen";
    const lines = sorted.map((r) =>
      `${r.name};${new Date(r.date).toLocaleDateString("nl-BE")};${r.confirmed};${r.responses};${r.responseRate.toFixed(0)};${r.audience.toFixed(1)};${r.conversation.toFixed(1)};${r.awareness.toFixed(1)};${r.interest.toFixed(1)};${r.effort.toFixed(1)};${r.participate.toFixed(1)}`
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `event-feedback-${academicYear}.csv`; a.click();
  };

  return (
    <div className="surface-card p-4 sm:p-5 mt-4 sm:mt-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <Star className="h-4 w-4" /> Feedback per event
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
          { icon: MessageSquare, label: "Totaal responses", value: totals.totalResponses },
          { icon: Star, label: "Gem. opnieuw deelnemen", value: totals.avgParticipate > 0 ? `${totals.avgParticipate.toFixed(1)}/5` : "—" },
          { icon: TrendingUp, label: "Gem. response rate", value: `${totals.avgResponseRate.toFixed(0)}%` },
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
              <SortableTableHead sortKey="name" currentSort={sort} onSort={toggleSort}>Event</SortableTableHead>
              <SortableTableHead sortKey="date" currentSort={sort} onSort={toggleSort}>Datum</SortableTableHead>
              <SortableTableHead sortKey="confirmed" currentSort={sort} onSort={toggleSort} className="text-right">Bevestigd</SortableTableHead>
              <SortableTableHead sortKey="responses" currentSort={sort} onSort={toggleSort} className="text-right">Responses</SortableTableHead>
              <SortableTableHead sortKey="responseRate" currentSort={sort} onSort={toggleSort} className="text-right">Rate</SortableTableHead>
              <SortableTableHead sortKey="audience" currentSort={sort} onSort={toggleSort}>Publiek</SortableTableHead>
              <SortableTableHead sortKey="conversation" currentSort={sort} onSort={toggleSort}>Gesprekken</SortableTableHead>
              <SortableTableHead sortKey="interest" currentSort={sort} onSort={toggleSort}>Interesse</SortableTableHead>
              <SortableTableHead sortKey="effort" currentSort={sort} onSort={toggleSort}>Effort/Return</SortableTableHead>
              <SortableTableHead sortKey="participate" currentSort={sort} onSort={toggleSort}>Opnieuw</SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                  Geen feedback data beschikbaar voor deze periode.
                </TableCell>
              </TableRow>
            ) : sorted.map((r) => (
              <TableRow
                key={r.eventId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/evenementen/${r.eventId}?tab=feedback`)}
              >
                <TableCell className="font-medium text-sm max-w-[200px] truncate">{r.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(r.date).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" })}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.confirmed}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.responses}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.responseRate.toFixed(0)}%</TableCell>
                <TableCell><ScoreBar value={r.audience} max={5} /></TableCell>
                <TableCell><ScoreBar value={r.conversation} max={4} /></TableCell>
                <TableCell><ScoreBar value={r.interest} max={5} /></TableCell>
                <TableCell><ScoreBar value={r.effort} max={3} /></TableCell>
                <TableCell><ScoreBar value={r.participate} max={5} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
          {sorted.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold text-sm">{sorted.length} events</TableCell>
                <TableCell />
                <TableCell className="text-right text-sm">—</TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-sm">{totals.totalResponses}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-sm">ø {totals.avgResponseRate.toFixed(0)}%</TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell><ScoreBar value={totals.avgParticipate} max={5} /></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
