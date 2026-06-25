import { useState, useMemo, useCallback, Fragment, useEffect } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOpleidingen, useOpleidingenPaged, useEventOpleidingen } from "@/hooks/useOpleidingen";
import { useScholen } from "@/hooks/useScholen";
import { writeAuditLog } from "@/lib/audit";
import { useEvenementen } from "@/hooks/useEvenementen";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Plus, ChevronDown, ChevronRight, Pencil, Trash2, Upload, BookOpen, ChevronLeft } from "lucide-react";
import { FIELDS_OF_STUDY } from "@/types/crm";
import type { Program } from "@/types/crm";
import { ProgramFormDialog } from "@/components/programs/ProgramFormDialog";
import { OrganisatieSelect } from "@/components/organisaties/OrganisatieSelect";
import { OrganisatieLabel } from "@/components/organisaties/OrganisatieLabel";
import { ImportDialog, ImportColumn } from "@/components/import/ImportDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SortableTableHead, useSort } from "@/components/ui/SortableTableHead";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 50;

const OPLEIDING_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Naam", required: true },
  { key: "school_name", label: "School", required: true },
  { key: "faculty", label: "Faculteit" },
  { key: "study_level", label: "Niveau", validate: (v) => !v || ["bachelor", "master", "graduaat"].includes(v.toLowerCase()) ? null : "Moet bachelor, master of graduaat zijn" },
  { key: "field_of_study", label: "Studierichting" },
  { key: "student_count", label: "Studenten", validate: (v) => !v || !isNaN(Number(v)) ? null : "Moet een getal zijn" },
];

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="surface-card p-4 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function OpleidingenPage() {
  const { opleidingen, upsertOpleiding } = useOpleidingen();
  const { scholen } = useScholen();
  const { evenementen } = useEvenementen();
  const { eventOpleidingen } = useEventOpleidingen();
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterField, setFilterField] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<Program | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { canEdit } = useAuth();
  const { sort, toggleSort } = useSort("name");
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever filters/search/sort change
  useEffect(() => { setPage(1); }, [search, filterLevel, filterField, filterSchool, sort.key, sort.direction]);

  const sortableKeys = new Set(["name", "study_level", "field_of_study", "student_count", "faculty"]);
  const sortKey = sortableKeys.has(sort.key) ? sort.key : "name";

  const { data: paged, isLoading } = useOpleidingenPaged({
    page,
    pageSize: PAGE_SIZE,
    search,
    organisatieId: filterSchool,
    studyLevel: filterLevel,
    field: filterField,
    sortKey,
    sortDir: sort.direction,
  });

  const rows = paged?.rows ?? [];
  const totalCount = paged?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, totalCount);
  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [page, totalPages]);

  const handleSave = useCallback(async (saved: Program) => {
    try { await upsertOpleiding.mutateAsync(saved); } catch { toast.error("Fout bij opslaan."); }
  }, [upsertOpleiding]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("opleidingen").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["opleidingen"] });
      toast.success("Opleiding verwijderd.");
    } catch (error) {
      handleDeleteError(error, "opleiding");
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  }, [deleteTarget, qc]);

  const sorted = useMemo(() => rows.map((p: any) => ({
    ...p,
    school: p.organisatie ?? scholen.find((s) => s.id === p.organisatie_id),
    linkedEvents: eventOpleidingen
      .filter((ep) => ep.program_id === p.id)
      .map((ep) => evenementen.find((e) => e.id === ep.event_id))
      .filter(Boolean),
  })), [rows, scholen, evenementen, eventOpleidingen]);

  const exportCSV = useCallback(() => {
    const headers = ["Opleiding", "School", "Faculteit", "Niveau", "Studierichting", "Studenten"];
    const rows = sorted.map((p) => [p.name, p.school?.name ?? "", p.faculty, p.study_level, p.field_of_study, p.student_count ?? ""]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "opleidingen_export.csv"; a.click();
    writeAuditLog({ action: "export", entity_type: "export", entity_id: "opleidingen-csv", entity_name: "Opleidingen export", changes: { row_count: rows.length, format: "csv" } });
  }, [sorted]);

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Opleidingen</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
          {canEdit && <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" /> Import</Button>}
          {canEdit && <Button size="sm" className="h-10 sm:h-8" onClick={() => { setEditProgram(undefined); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nieuwe opleiding</Button>}
        </div>
      </div>

      <div className="surface-card p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Zoeken op richting of studiedomein..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 sm:h-9" /></div>
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <OrganisatieSelect value={filterSchool} onChange={setFilterSchool} allOption allLabel="Alle scholen" allValue="all" placeholder="School" className="w-full sm:w-[180px] h-10 sm:h-9" />
            <Select value={filterLevel} onValueChange={setFilterLevel}><SelectTrigger className="w-full sm:w-[150px] h-10 sm:h-9"><SelectValue placeholder="Niveau" /></SelectTrigger><SelectContent><SelectItem value="all">Alle niveaus</SelectItem><SelectItem value="bachelor">Bachelor</SelectItem><SelectItem value="master">Master</SelectItem><SelectItem value="graduaat">Graduaat</SelectItem></SelectContent></Select>
            <Select value={filterField} onValueChange={setFilterField}><SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9 col-span-2 sm:col-span-1"><SelectValue placeholder="Studierichting" /></SelectTrigger><SelectContent><SelectItem value="all">Alle richtingen</SelectItem>{FIELDS_OF_STUDY.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
      </div>

      {isLoading ? <ListSkeleton /> : totalCount === 0 && !search && filterLevel === "all" && filterField === "all" && filterSchool === "all" ? (
        <EmptyState icon={BookOpen} title="Nog geen opleidingen toegevoegd" description="Voeg je eerste opleiding toe." actionLabel="Nieuwe opleiding" onAction={() => { setEditProgram(undefined); setDialogOpen(true); }} />
      ) : (
        <>
          <div className="block md:hidden space-y-2">
            {sorted.length === 0 ? <div className="surface-card p-6 text-center text-sm text-muted-foreground">Geen opleidingen gevonden.</div> : sorted.map((p) => (
              <div key={p.id} className="surface-card overflow-hidden">
                <div className="p-4 cursor-pointer active:scale-[0.99] transition-transform" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1"><p className="font-medium text-sm flex items-center gap-1.5 flex-wrap">{p.name}{p.is_stem && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 border-blue-200">STEM</Badge>}</p><Link to={`/organisaties/${p.organisatie_id}`} className="text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{p.school?.name}<OrganisatieLabel organisatieId={p.organisatie_id} /></Link><p className="text-xs text-muted-foreground mt-0.5 capitalize">{p.study_level} · {p.field_of_study}</p></div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium tabular-nums">{p.student_count ?? "—"}</span>
                      {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                    </div>
                  </div>
                </div>
                {expandedId === p.id && p.linkedEvents.length > 0 && (
                  <div className="px-4 pb-3 border-t border-border pt-3"><p className="text-xs font-semibold text-muted-foreground mb-2">Gekoppelde evenementen</p><div className="flex flex-wrap gap-1.5">{p.linkedEvents.map((ev) => ev && <Link key={ev.id} to={`/evenementen/${ev.id}`} className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/70">{ev.name}</Link>)}</div></div>
                )}
              </div>
            ))}
            <div className="text-xs text-muted-foreground px-1 pt-2">{rangeFrom}-{rangeTo} van {totalCount} opleiding{totalCount !== 1 ? "en" : ""}</div>
          </div>

          <div className="surface-card overflow-hidden hidden md:block">
            <Table><TableHeader><TableRow>
              <TableHead className="w-8"></TableHead>
              <SortableTableHead sortKey="name" currentSort={sort} onSort={toggleSort}>Opleiding</SortableTableHead>
              <TableHead>School</TableHead>
              <SortableTableHead sortKey="faculty" currentSort={sort} onSort={toggleSort} className="hidden lg:table-cell">Faculteit</SortableTableHead>
              <SortableTableHead sortKey="study_level" currentSort={sort} onSort={toggleSort}>Niveau</SortableTableHead>
              <SortableTableHead sortKey="field_of_study" currentSort={sort} onSort={toggleSort} className="hidden lg:table-cell">Studierichting</SortableTableHead>
              <SortableTableHead sortKey="student_count" currentSort={sort} onSort={toggleSort} className="text-right">Studenten</SortableTableHead>
              <TableHead className="w-20" />
            </TableRow></TableHeader>
              <TableBody>{sorted.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen opleidingen gevonden.</TableCell></TableRow> : sorted.map((p) => (
                <Fragment key={p.id}>
                  <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    <TableCell className="px-2">{p.linkedEvents.length > 0 && (expandedId === p.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}</TableCell>
                    <TableCell className="font-medium"><div className="flex items-center gap-1.5 flex-wrap"><span>{p.name}</span>{p.is_stem && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 border-blue-200">STEM</Badge>}</div></TableCell>
                    <TableCell><Link to={`/organisaties/${p.organisatie_id}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{p.school?.name}<OrganisatieLabel organisatieId={p.organisatie_id} /></Link></TableCell>
                    <TableCell className="hidden lg:table-cell">{p.faculty}</TableCell>
                    <TableCell className="capitalize">{p.study_level}</TableCell>
                    <TableCell className="hidden lg:table-cell">{p.field_of_study}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.student_count ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditProgram(p); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>}
                        {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === p.id && p.linkedEvents.length > 0 && (
                    <TableRow><TableCell colSpan={8} className="bg-muted/20 px-6 py-3"><p className="text-xs font-semibold text-muted-foreground mb-2">Gekoppelde evenementen</p><div className="flex flex-wrap gap-2">{p.linkedEvents.map((ev) => ev && <Link key={ev.id} to={`/evenementen/${ev.id}`} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"><span className="font-medium">{ev.name}</span><span className="text-muted-foreground">{new Date(ev.date).toLocaleDateString("nl-BE")}</span><StatusBadge status={ev.status} /></Link>)}</div></TableCell></TableRow>
                  )}
                </Fragment>
              ))}</TableBody></Table>
            <div className="p-3 border-t border-border text-xs text-muted-foreground">{rangeFrom}-{rangeTo} van {totalCount} opleiding{totalCount !== 1 ? "en" : ""}</div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
              <div className="text-xs text-muted-foreground">{rangeFrom}-{rangeTo} van {totalCount}</div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Vorige pagina"><ChevronLeft className="h-4 w-4" /></Button>
                {pageNumbers[0] > 1 && (
                  <>
                    <Button variant="ghost" size="sm" className="h-8 min-w-8 px-2" onClick={() => setPage(1)}>1</Button>
                    {pageNumbers[0] > 2 && <span className="px-1 text-muted-foreground">…</span>}
                  </>
                )}
                {pageNumbers.map((n) => (
                  <Button key={n} variant={n === page ? "default" : "ghost"} size="sm" className="h-8 min-w-8 px-2" onClick={() => setPage(n)}>{n}</Button>
                ))}
                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="px-1 text-muted-foreground">…</span>}
                    <Button variant="ghost" size="sm" className="h-8 min-w-8 px-2" onClick={() => setPage(totalPages)}>{totalPages}</Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Volgende pagina"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <ProgramFormDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditProgram(undefined); }} program={editProgram} onSave={handleSave} />
      <DeleteConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} itemName={deleteTarget?.name ?? ""} isLoading={isDeleting} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Opleidingen importeren"
        columns={OPLEIDING_IMPORT_COLUMNS}
        templateFilename="opleidingen_template.xlsx"
        duplicateCheck={{ keys: ["name", "school_name"], existingData: opleidingen.map((o) => ({ name: o.name, school_name: scholen.find((s) => s.id === o.organisatie_id)?.name ?? "" })) }}
        onImport={async (rows) => {
          for (const row of rows) {
            const school = scholen.find((s) => s.name.toLowerCase() === row.school_name?.toLowerCase().trim());
            if (!school) continue;
            await upsertOpleiding.mutateAsync({
              name: row.name,
              organisatie_id: school.id,
              faculty: row.faculty || "",
              study_level: (row.study_level?.toLowerCase() || "bachelor") as any,
              field_of_study: row.field_of_study || "",
              student_count: row.student_count ? Number(row.student_count) : null,
            });
          }
        }}
      />
    </div>
  );
}
