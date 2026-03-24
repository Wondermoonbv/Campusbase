import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mockEvents, mockSchools, mockPrograms, mockEventPrograms } from "@/data/mockData";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Download, CalendarDays, List, Pencil, Upload } from "lucide-react";
import { EventFormDialog } from "@/components/events/EventFormDialog";
import { CsvImportDialog, CsvColumn } from "@/components/import/CsvImportDialog";
import { FIELDS_OF_STUDY } from "@/types/crm";

const EVENT_CSV_COLUMNS: CsvColumn[] = [
  { key: "name", label: "Naam", required: true },
  { key: "type", label: "Type", required: true, validate: (v) => ["jobbeurs", "campus presentatie", "workshop", "hackathon", "andere"].includes(v.toLowerCase()) ? null : "Ongeldig type" },
  { key: "date", label: "Datum", required: true, validate: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : "Formaat: YYYY-MM-DD" },
  { key: "start_time", label: "Startuur" },
  { key: "end_time", label: "Einduur" },
  { key: "location", label: "Locatie", required: true },
  { key: "responsible", label: "Verantwoordelijke" },
  { key: "budget", label: "Budget", validate: (v) => isNaN(Number(v)) ? "Moet een getal zijn" : null },
  { key: "status", label: "Status", validate: (v) => ["gepland", "bevestigd", "afgelopen", "geannuleerd"].includes(v.toLowerCase()) ? null : "Ongeldige status" },
  { key: "description", label: "Beschrijving" },
];

export default function EventenPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPeriod = searchParams.get("period") ?? "all"; // "thisYear" or "next30"
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFieldOfStudy, setFilterFieldOfStudy] = useState("all");
  const [filterPeriod] = useState(initialPeriod);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 86400000);
    return mockEvents.filter((e) => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || e.type === filterType;
      const matchStatus = filterStatus === "all" || e.status === filterStatus;

      let matchPeriod = true;
      if (filterPeriod === "thisYear") {
        matchPeriod = new Date(e.date).getFullYear() === now.getFullYear();
      } else if (filterPeriod === "next30") {
        const d = new Date(e.date);
        matchPeriod = d >= now && d <= in30Days;
      }

      let matchField = true;
      if (filterFieldOfStudy !== "all") {
        const linkedProgramIds = mockEventPrograms
          .filter((ep) => ep.event_id === e.id)
          .map((ep) => ep.program_id);
        const linkedPrograms = mockPrograms.filter((p) => linkedProgramIds.includes(p.id));
        matchField = linkedPrograms.some((p) => p.field_of_study === filterFieldOfStudy);
      }

      return matchSearch && matchType && matchStatus && matchField && matchPeriod;
    });
  }, [search, filterType, filterStatus, filterFieldOfStudy, filterPeriod]);

  const byMonth = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((e) => {
      const key = new Date(e.date).toLocaleDateString("nl-BE", { year: "numeric", month: "long" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["Naam", "Type", "Datum", "Locatie", "Status", "Verantwoordelijke", "Budget"];
    const rows = filtered.map((e) => [e.name, e.type, e.date, e.location, e.status, e.responsible, e.budget ?? ""]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "evenementen_export.csv"; a.click();
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1>Evenementen</h1>
        <div className="flex gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 text-sm ${view === "calendar" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Evenement toevoegen
          </Button>
        </div>
      </div>

      <div className="surface-card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle types</SelectItem>
              <SelectItem value="jobbeurs">Jobbeurs</SelectItem>
              <SelectItem value="campus presentatie">Campus presentatie</SelectItem>
              <SelectItem value="workshop">Workshop</SelectItem>
              <SelectItem value="hackathon">Hackathon</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="gepland">Gepland</SelectItem>
              <SelectItem value="bevestigd">Bevestigd</SelectItem>
              <SelectItem value="afgelopen">Afgelopen</SelectItem>
              <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFieldOfStudy} onValueChange={setFilterFieldOfStudy}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Studiedomein" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle domeinen</SelectItem>
              {FIELDS_OF_STUDY.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "list" ? (
        <div className="surface-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evenement</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="hidden md:table-cell">Locatie</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ev) => (
                <TableRow
                  key={ev.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/evenementen/${ev.id}`)}
                >
                  <TableCell className="font-medium">{ev.name}</TableCell>
                  <TableCell className="tabular-nums">{new Date(ev.date).toLocaleDateString("nl-BE")}</TableCell>
                  <TableCell className="hidden md:table-cell">{ev.location}</TableCell>
                  <TableCell><StatusBadge status={ev.status} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/evenementen/${ev.id}`); }}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-3 border-t border-border text-xs text-muted-foreground">
            {filtered.length} evenement{filtered.length !== 1 ? "en" : ""} gevonden
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {byMonth.map(([month, events]) => (
            <div key={month}>
              <h2 className="mb-3 capitalize">{month}</h2>
              <div className="space-y-2">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="surface-card p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/evenementen/${ev.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[48px]">
                        <div className="text-2xl font-semibold tabular-nums">{new Date(ev.date).getDate()}</div>
                        <div className="text-xs text-muted-foreground uppercase">
                          {new Date(ev.date).toLocaleDateString("nl-BE", { weekday: "short" })}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{ev.name}</p>
                        <p className="text-xs text-muted-foreground">{ev.location}</p>
                      </div>
                    </div>
                    <StatusBadge status={ev.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
