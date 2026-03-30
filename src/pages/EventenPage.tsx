import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useOpleidingen, useEventOpleidingen } from "@/hooks/useOpleidingen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Download, CalendarDays, List, Pencil, Upload, Trash2 } from "lucide-react";
import { EventFormDialog } from "@/components/events/EventFormDialog";
import { CsvImportDialog, CsvColumn } from "@/components/import/CsvImportDialog";
import { FIELDS_OF_STUDY } from "@/types/crm";
import type { Event } from "@/types/crm";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import { toast } from "sonner";

const EVENT_CSV_COLUMNS: CsvColumn[] = [
  { key: "name", label: "Naam", required: true },
  { key: "type", label: "Type", required: true, validate: (v) => ["jobbeurs", "campus presentatie", "workshop", "hackathon", "andere"].includes(v.toLowerCase()) ? null : "Ongeldig type" },
  { key: "date", label: "Datum", required: true, validate: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : "Formaat: YYYY-MM-DD" },
  { key: "start_time", label: "Startuur" }, { key: "end_time", label: "Einduur" },
  { key: "location", label: "Locatie", required: true }, { key: "responsible", label: "Verantwoordelijke" },
  { key: "budget", label: "Budget", validate: (v) => isNaN(Number(v)) ? "Moet een getal zijn" : null },
  { key: "status", label: "Status", validate: (v) => ["gepland", "bevestigd", "afgelopen", "geannuleerd"].includes(v.toLowerCase()) ? null : "Ongeldige status" },
  { key: "description", label: "Beschrijving" },
];

export default function EventenPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPeriod = searchParams.get("period") ?? "all";
  const { evenementen, upsertEvent, deleteEvent } = useEvenementen();
  const { opleidingen } = useOpleidingen();
  const { eventOpleidingen } = useEventOpleidingen();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFieldOfStudy, setFilterFieldOfStudy] = useState("all");
  const [filterPeriod] = useState(initialPeriod);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const { canEdit } = useAuth();
  const { sort, toggleSort } = useSort("name");

  const handleSave = async (saved: Event) => {
    try { await upsertEvent.mutateAsync(saved); } catch { toast.error("Fout bij opslaan."); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEvent.mutateAsync(deleteTarget.id);
      toast.success("Evenement verwijderd.");
    } catch (error) {
      handleDeleteError(error, "evenement");
    }
    setDeleteTarget(null);
  };

  const filtered = useMemo(() => {
    const now = new Date(); const in30Days = new Date(now.getTime() + 30 * 86400000);
    return evenementen.filter((e) => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.location.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || e.type === filterType;
      const matchStatus = filterStatus === "all" || e.status === filterStatus;
      let matchPeriod = true;
      if (filterPeriod === "thisYear") matchPeriod = new Date(e.date).getFullYear() === now.getFullYear();
      else if (filterPeriod === "next30") { const d = new Date(e.date); matchPeriod = d >= now && d <= in30Days; }
      let matchField = true;
      if (filterFieldOfStudy !== "all") {
        const linkedProgramIds = eventOpleidingen.filter((ep) => ep.event_id === e.id).map((ep) => ep.program_id);
        const linkedPrograms = opleidingen.filter((p) => linkedProgramIds.includes(p.id));
        matchField = linkedPrograms.some((p) => p.field_of_study === filterFieldOfStudy);
      }
      return matchSearch && matchType && matchStatus && matchField && matchPeriod;
    });
  }, [evenementen, opleidingen, eventOpleidingen, search, filterType, filterStatus, filterFieldOfStudy, filterPeriod]);

  const sorted = useMemo(() => sortItems(filtered, sort, (e, key) => {
    switch (key) { case "name": return e.name; case "date": return new Date(e.date).getTime(); case "location": return e.location; case "status": return e.status; default: return e.name; }
  }), [filtered, sort]);

  const byMonth = useMemo(() => {
    const sortedByDate = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const groups: Record<string, typeof filtered> = {};
    sortedByDate.forEach((e) => { const key = new Date(e.date).toLocaleDateString("nl-BE", { year: "numeric", month: "long" }); if (!groups[key]) groups[key] = []; groups[key].push(e); });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["Naam", "Type", "Datum", "Locatie", "Status", "Verantwoordelijke", "Budget"];
    const rows = sorted.map((e) => [e.name, e.type, e.date, e.location, e.status, e.responsible, e.budget ?? ""]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n"); const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "evenementen_export.csv"; a.click();
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Evenementen</h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            <button onClick={() => setView("list")} className={`px-3 py-2 sm:py-1.5 text-sm ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}><List className="h-4 w-4" /></button>
            <button onClick={() => setView("calendar")} className={`px-3 py-2 sm:py-1.5 text-sm ${view === "calendar" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}><CalendarDays className="h-4 w-4" /></button>
          </div>
          <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Export</span></Button>
          {canEdit && <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Import</span></Button>}
          {canEdit && <Button size="sm" className="h-10 sm:h-8" onClick={() => { setEditEvent(undefined); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Evenement toevoegen</span><span className="sm:hidden">Nieuw</span></Button>}
        </div>
      </div>

      <div className="surface-card p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 sm:h-9" /></div>
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">Alle types</SelectItem><SelectItem value="jobbeurs">Jobbeurs</SelectItem><SelectItem value="campus presentatie">Campus presentatie</SelectItem><SelectItem value="workshop">Workshop</SelectItem><SelectItem value="hackathon">Hackathon</SelectItem></SelectContent></Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-full sm:w-[150px] h-10 sm:h-9"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Alle statussen</SelectItem><SelectItem value="gepland">Gepland</SelectItem><SelectItem value="bevestigd">Bevestigd</SelectItem><SelectItem value="afgelopen">Afgelopen</SelectItem><SelectItem value="geannuleerd">Geannuleerd</SelectItem></SelectContent></Select>
            <Select value={filterFieldOfStudy} onValueChange={setFilterFieldOfStudy}><SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9 col-span-2 sm:col-span-1"><SelectValue placeholder="Studiedomein" /></SelectTrigger><SelectContent><SelectItem value="all">Alle domeinen</SelectItem>{FIELDS_OF_STUDY.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <>
          <div className="block md:hidden space-y-2">
            {sorted.length === 0 ? <div className="surface-card p-6 text-center text-sm text-muted-foreground">Geen evenementen gevonden.</div> : sorted.map((ev) => (
              <div key={ev.id} className="surface-card p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/evenementen/${ev.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1"><p className="font-medium text-sm truncate">{ev.name}</p><p className="text-xs text-muted-foreground mt-0.5">{new Date(ev.date).toLocaleDateString("nl-BE")} · {ev.location}</p></div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={ev.status} />
                    {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); setDeleteTarget(ev); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                  </div>
                </div>
              </div>
            ))}
            <div className="text-xs text-muted-foreground px-1 pt-2">{sorted.length} evenement{sorted.length !== 1 ? "en" : ""} gevonden</div>
          </div>
          <div className="surface-card overflow-hidden hidden md:block">
            <Table><TableHeader><TableRow>
              <SortableTableHead sortKey="name" currentSort={sort} onSort={toggleSort}>Evenement</SortableTableHead>
              <SortableTableHead sortKey="date" currentSort={sort} onSort={toggleSort}>Datum</SortableTableHead>
              <SortableTableHead sortKey="location" currentSort={sort} onSort={toggleSort}>Locatie</SortableTableHead>
              <SortableTableHead sortKey="status" currentSort={sort} onSort={toggleSort}>Status</SortableTableHead>
              <TableHead className="w-20" />
            </TableRow></TableHeader>
              <TableBody>{sorted.map((ev) => (
                <TableRow key={ev.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/evenementen/${ev.id}`)}>
                  <TableCell className="font-medium">{ev.name}</TableCell>
                  <TableCell className="tabular-nums">{new Date(ev.date).toLocaleDateString("nl-BE")}</TableCell>
                  <TableCell>{ev.location}</TableCell>
                  <TableCell><StatusBadge status={ev.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/evenementen/${ev.id}`); }}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>}
                      {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDeleteTarget(ev); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}</TableBody></Table>
            <div className="p-3 border-t border-border text-xs text-muted-foreground">{sorted.length} evenement{sorted.length !== 1 ? "en" : ""} gevonden</div>
          </div>
        </>
      ) : (
        <div className="space-y-6">{byMonth.map(([month, events]) => (
          <div key={month}><h2 className="mb-3 capitalize">{month}</h2><div className="space-y-2">{events.map((ev) => (
            <div key={ev.id} className="surface-card p-3 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 active:scale-[0.99] transition-[transform,colors]" onClick={() => navigate(`/evenementen/${ev.id}`)}>
              <div className="flex items-center gap-3 sm:gap-4"><div className="text-center min-w-[40px] sm:min-w-[48px]"><div className="text-xl sm:text-2xl font-semibold tabular-nums">{new Date(ev.date).getDate()}</div><div className="text-xs text-muted-foreground uppercase">{new Date(ev.date).toLocaleDateString("nl-BE", { weekday: "short" })}</div></div><div><p className="font-medium text-sm">{ev.name}</p><p className="text-xs text-muted-foreground">{ev.location}</p></div></div>
              <div className="flex items-center gap-1">
                <StatusBadge status={ev.status} />
                {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); setDeleteTarget(ev); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
              </div>
            </div>
          ))}</div></div>
        ))}</div>
      )}

      <EventFormDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditEvent(undefined); }} event={editEvent} onSave={handleSave} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} title="Evenementen importeren" columns={EVENT_CSV_COLUMNS} templateFilename="evenementen_template.csv" onImport={(rows) => { console.log("Import events:", rows); }} />
      <DeleteConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} itemName={deleteTarget?.name ?? ""} isLoading={deleteEvent.isPending} />
    </div>
  );
}
