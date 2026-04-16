import { useState, useMemo, useCallback } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useEventContactpersonen } from "@/hooks/useEventContactpersonen";
import { useOpleidingen, useEventOpleidingen } from "@/hooks/useOpleidingen";
import { writeAuditLog } from "@/lib/audit";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, CalendarDays, List, Pencil, Upload, Trash2, Calendar, Link2, Filter } from "lucide-react";
import { EventFormDialog } from "@/components/events/EventFormDialog";
import { EventCalendar } from "@/components/events/EventCalendar";
import { ImportDialog, ImportColumn } from "@/components/import/ImportDialog";
import { FIELDS_OF_STUDY } from "@/types/crm";
import type { Event, ContactpersoonRol } from "@/types/crm";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import { toast } from "sonner";
import { REGION_LABELS, EVENT_LANGUAGE_LABELS, TARGET_LEVEL_LABELS, REGISTRATION_TYPE_LABELS, FOLLOW_UP_LABELS, followUpVariant } from "@/lib/event-labels";

const EVENT_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Naam", required: true },
  { key: "type", label: "Type", required: true, validate: (v) => ["jobbeurs", "campus presentatie", "workshop", "hackathon", "andere"].includes(v.toLowerCase()) ? null : "Ongeldig type" },
  { key: "date", label: "Datum", required: true, validate: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : "Formaat: YYYY-MM-DD" },
  { key: "start_time", label: "Startuur" }, { key: "end_time", label: "Einduur" },
  { key: "location", label: "Locatie", required: true }, { key: "responsible", label: "Verantwoordelijke" },
  { key: "budget", label: "Budget", validate: (v) => !v || !isNaN(Number(v)) ? null : "Moet een getal zijn" },
  { key: "status", label: "Status", validate: (v) => !v || ["gepland", "bevestigd", "afgelopen", "geannuleerd"].includes(v.toLowerCase()) ? null : "Ongeldige status" },
  { key: "description", label: "Beschrijving" },
];

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="surface-card p-4 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export default function EventenPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPeriod = searchParams.get("period") ?? "all";
  const { evenementen, isLoading, upsertEvent, deleteEvent } = useEvenementen();
  const { syncContactpersonen } = useEventContactpersonen();
  const { opleidingen } = useOpleidingen();
  const { eventOpleidingen } = useEventOpleidingen();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFieldOfStudy, setFilterFieldOfStudy] = useState("all");
  const [filterPeriod] = useState(initialPeriod);
  const [filterRegio, setFilterRegio] = useState("all");
  const [filterTaal, setFilterTaal] = useState("all");
  const [filterDoelgroep, setFilterDoelgroep] = useState("all");
  const [filterRegistratie, setFilterRegistratie] = useState("all");
  const [filterFollowUp, setFilterFollowUp] = useState("all");
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const { canEdit } = useAuth();
  const { sort, toggleSort } = useSort("name");

  const handleSave = useCallback(async (saved: Event, cpEntries?: { contact_id: string; rol: ContactpersoonRol }[]) => {
    try {
      const result = await upsertEvent.mutateAsync(saved);
      const eventId = (result as any)?.data?.id || saved.id;
      if (eventId && cpEntries && cpEntries.length > 0) {
        await syncContactpersonen.mutateAsync({ eventId, items: cpEntries });
      }
    } catch { toast.error("Fout bij opslaan."); }
  }, [upsertEvent, syncContactpersonen]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteEvent.mutateAsync({ id: deleteTarget.id, name: deleteTarget.name });
      toast.success("Evenement verwijderd.");
    } catch (error) {
      handleDeleteError(error, "evenement");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteEvent]);

  const filtered = useMemo(() => {
    const now = new Date(); const in30Days = new Date(now.getTime() + 30 * 86400000);
    return evenementen.filter((e) => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.location.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || e.type === filterType;
      const matchStatus = filterStatus === "all" || e.status === filterStatus;
      const matchRegio = filterRegio === "all" || e.region === filterRegio;
      const matchTaal = filterTaal === "all" || e.event_language === filterTaal;
      const matchDoelgroep = filterDoelgroep === "all" || e.target_level === filterDoelgroep;
      const matchRegistratie = filterRegistratie === "all" || e.registration_type === filterRegistratie;
      const matchFollowUp = filterFollowUp === "all" || e.follow_up_status === filterFollowUp;
      let matchPeriod = true;
      if (filterPeriod === "thisYear") matchPeriod = new Date(e.date).getFullYear() === now.getFullYear();
      else if (filterPeriod === "next30") { const d = new Date(e.date); matchPeriod = d >= now && d <= in30Days; }
      let matchField = true;
      if (filterFieldOfStudy !== "all") {
        const linkedProgramIds = eventOpleidingen.filter((ep) => ep.event_id === e.id).map((ep) => ep.program_id);
        const linkedPrograms = opleidingen.filter((p) => linkedProgramIds.includes(p.id));
        matchField = linkedPrograms.some((p) => p.field_of_study === filterFieldOfStudy);
      }
      return matchSearch && matchType && matchStatus && matchField && matchPeriod && matchRegio && matchTaal && matchDoelgroep && matchRegistratie && matchFollowUp;
    });
  }, [evenementen, opleidingen, eventOpleidingen, search, filterType, filterStatus, filterFieldOfStudy, filterPeriod, filterRegio, filterTaal, filterDoelgroep, filterRegistratie, filterFollowUp]);

  const sorted = useMemo(() => sortItems(filtered, sort, (e, key) => {
    switch (key) { case "name": return e.name; case "date": return new Date(e.date).getTime(); case "location": return e.location; case "status": return e.status; case "follow_up": return e.follow_up_status || ""; default: return e.name; }
  }), [filtered, sort]);

  const exportCSV = useCallback(() => {
    const headers = ["Naam", "Type", "Datum", "Locatie", "Status", "Budget", "Follow-up"];
    const rows = sorted.map((e) => [e.name, e.type, e.date, e.location, e.status, e.budget ?? "", FOLLOW_UP_LABELS[e.follow_up_status || ""] || ""]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n"); const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "evenementen_export.csv"; a.click();
    writeAuditLog({ action: "export", entity_type: "export", entity_id: "evenementen-csv", entity_name: "Evenementen export", changes: { row_count: rows.length, format: "csv" } });
  }, [sorted]);

  const hasExtraFilters = filterRegio !== "all" || filterTaal !== "all" || filterDoelgroep !== "all" || filterRegistratie !== "all" || filterFollowUp !== "all";

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Evenementen</h1>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/ambassadeur-portaal`);
              toast.success("Portaallink gekopieerd! (voor nieuwe registraties)");
            }}>
              <Link2 className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Portaallink</span>
            </Button>
          )}
          <div className="flex border border-border rounded overflow-hidden">
            <button onClick={() => setView("list")} aria-label="Lijstweergave" aria-pressed={view === "list"} className={`px-3 py-2 sm:py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}><List className="h-4 w-4" /></button>
            <button onClick={() => setView("calendar")} aria-label="Kalenderweergave" aria-pressed={view === "calendar"} className={`px-3 py-2 sm:py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === "calendar" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}><CalendarDays className="h-4 w-4" /></button>
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
            <Button variant={showExtraFilters || hasExtraFilters ? "default" : "outline"} size="sm" className="h-10 sm:h-9" onClick={() => setShowExtraFilters(!showExtraFilters)}>
              <Filter className="h-4 w-4 mr-1" /> Meer{hasExtraFilters ? ` (${[filterRegio, filterTaal, filterDoelgroep, filterRegistratie, filterFollowUp].filter(f => f !== "all").length})` : ""}
            </Button>
          </div>
        </div>
        {showExtraFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mt-3 pt-3 border-t border-border">
            <Select value={filterRegio} onValueChange={setFilterRegio}><SelectTrigger className="h-10 sm:h-9"><SelectValue placeholder="Regio" /></SelectTrigger><SelectContent><SelectItem value="all">Alle regio's</SelectItem>{Object.entries(REGION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            <Select value={filterTaal} onValueChange={setFilterTaal}><SelectTrigger className="h-10 sm:h-9"><SelectValue placeholder="Taal" /></SelectTrigger><SelectContent><SelectItem value="all">Alle talen</SelectItem>{Object.entries(EVENT_LANGUAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            <Select value={filterDoelgroep} onValueChange={setFilterDoelgroep}><SelectTrigger className="h-10 sm:h-9"><SelectValue placeholder="Doelgroep" /></SelectTrigger><SelectContent><SelectItem value="all">Alle niveaus</SelectItem>{Object.entries(TARGET_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            <Select value={filterRegistratie} onValueChange={setFilterRegistratie}><SelectTrigger className="h-10 sm:h-9"><SelectValue placeholder="Registratie" /></SelectTrigger><SelectContent><SelectItem value="all">Alle types</SelectItem>{Object.entries(REGISTRATION_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            <Select value={filterFollowUp} onValueChange={setFilterFollowUp}><SelectTrigger className="h-10 sm:h-9"><SelectValue placeholder="Follow-up" /></SelectTrigger><SelectContent><SelectItem value="all">Alle statussen</SelectItem>{Object.entries(FOLLOW_UP_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
          </div>
        )}
      </div>

      {isLoading ? <ListSkeleton /> : evenementen.length === 0 ? (
        <EmptyState icon={Calendar} title="Geen evenementen gevonden" description="Voeg je eerste evenement toe om te beginnen." actionLabel="Evenement toevoegen" onAction={() => { setEditEvent(undefined); setDialogOpen(true); }} />
      ) : view === "list" ? (
        <>
          <div className="block md:hidden space-y-2">
            {sorted.length === 0 ? <div className="surface-card p-6 text-center text-sm text-muted-foreground">Geen evenementen gevonden.</div> : sorted.map((ev) => (
              <div key={ev.id} className="surface-card p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/evenementen/${ev.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{ev.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(ev.date).toLocaleDateString("nl-BE")} · {ev.location || "—"}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <StatusBadge status={ev.status} />
                      {ev.follow_up_status && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${followUpVariant(ev.follow_up_status)}`}>
                          {FOLLOW_UP_LABELS[ev.follow_up_status] || ev.follow_up_status}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`${ev.name} verwijderen`} onClick={(e) => { e.stopPropagation(); setDeleteTarget(ev); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
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
              <SortableTableHead sortKey="follow_up" currentSort={sort} onSort={toggleSort}>Follow-up</SortableTableHead>
              <TableHead className="w-20" />
            </TableRow></TableHeader>
              <TableBody>{sorted.map((ev) => (
                <TableRow key={ev.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/evenementen/${ev.id}`)}>
                  <TableCell className="font-medium">{ev.name}</TableCell>
                  <TableCell className="tabular-nums">{new Date(ev.date).toLocaleDateString("nl-BE")}</TableCell>
                  <TableCell>{ev.location || "—"}</TableCell>
                  <TableCell><StatusBadge status={ev.status} /></TableCell>
                  <TableCell>
                    {ev.follow_up_status && (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${followUpVariant(ev.follow_up_status)}`}>
                        {FOLLOW_UP_LABELS[ev.follow_up_status] || ev.follow_up_status}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${ev.name} bewerken`} onClick={(e) => { e.stopPropagation(); navigate(`/evenementen/${ev.id}`); }}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>}
                      {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${ev.name} verwijderen`} onClick={(e) => { e.stopPropagation(); setDeleteTarget(ev); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}</TableBody></Table>
            <div className="p-3 border-t border-border text-xs text-muted-foreground">{sorted.length} evenement{sorted.length !== 1 ? "en" : ""} gevonden</div>
          </div>
        </>
      ) : (
        <EventCalendar events={filtered} />
      )}

      <EventFormDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditEvent(undefined); }} event={editEvent} onSave={handleSave} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Evenementen importeren"
        columns={EVENT_IMPORT_COLUMNS}
        templateFilename="evenementen_template.xlsx"
        duplicateCheck={{ keys: ["name", "date"], existingData: evenementen.map((e) => ({ name: e.name, date: e.date })) }}
        onImport={async (rows) => {
          for (const row of rows) {
            await upsertEvent.mutateAsync({
              name: row.name,
              type: (row.type?.toLowerCase() || "jobbeurs") as any,
              date: row.date,
              start_time: row.start_time || "",
              end_time: row.end_time || "",
              location: row.location || "",
              budget: row.budget ? Number(row.budget) : null,
              status: (row.status?.toLowerCase() || "gepland") as any,
              description: row.description || "",
            });
          }
        }}
      />
      <DeleteConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} itemName={deleteTarget?.name ?? ""} isLoading={deleteEvent.isPending} />
    </div>
  );
}
