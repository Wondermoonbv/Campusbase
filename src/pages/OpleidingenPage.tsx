import { useState, useMemo, useCallback, Fragment, useEffect } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOpleidingen, useRichtingenPaged, useRichtingAanbieders, useRichtingFieldOptions } from "@/hooks/useOpleidingen";
import { useScholen } from "@/hooks/useScholen";
import { writeAuditLog } from "@/lib/audit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Plus, ChevronDown, ChevronRight, Upload, BookOpen, ChevronLeft, X } from "lucide-react";
import type { Program } from "@/types/crm";
import { ProgramFormDialog } from "@/components/programs/ProgramFormDialog";
import { ImportDialog, ImportColumn } from "@/components/import/ImportDialog";
import { SortableTableHead, useSort } from "@/components/ui/SortableTableHead";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 50;

function formatStudiegebied(value?: string | null): string {
  if (!value) return "";
  const lower = value.toLocaleLowerCase("nl-BE");
  return lower.charAt(0).toLocaleUpperCase("nl-BE") + lower.slice(1);
}

const OPLEIDING_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Naam", required: true },
  { key: "school_name", label: "School", required: true },
  { key: "faculty", label: "Faculteit" },
  { key: "study_level", label: "Graad", validate: (v) => !v || ["bachelor", "master", "graduaat"].includes(v.toLowerCase()) ? null : "Moet bachelor, master of graduaat zijn" },
  { key: "field_of_study", label: "Studiegebied" },
  { key: "student_count", label: "Studenten", validate: (v) => !v || !isNaN(Number(v)) ? null : "Moet een getal zijn" },
];

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
      <span className="truncate max-w-[220px]">{label}</span>
      <button type="button" aria-label={`${label} verwijderen`} onClick={onClear} className="hover:text-foreground text-muted-foreground">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

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

function AanbiedersList({ naam, field, niveau }: { naam: string; field: string | null; niveau: string | null }) {
  const bron = niveau === "SO" ? "ahovoks" : niveau === "HO" ? "hor" : null;
  const { data, isLoading } = useRichtingAanbieders(naam, field, true, bron);
  if (isLoading) return <div className="px-4 py-3 text-xs text-muted-foreground">Aanbieders laden…</div>;
  const rows = data ?? [];
  if (rows.length === 0) return <div className="px-4 py-3 text-xs text-muted-foreground">Geen aanbieders gevonden.</div>;
  return (
    <div className="px-4 py-3 space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground mb-1">Aanbieders ({rows.length})</p>
      <ul className="divide-y divide-border/60">
        {rows.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 py-1.5">
            <div className="min-w-0 flex-1">
              <Link to={`/organisaties/${a.organisatie_id}`} className="text-sm text-primary hover:underline">
                {a.organisatie?.name ?? "—"}
              </Link>
              {a.organisatie?.parent?.name && (
                <div className="text-[11px] text-muted-foreground">onder {a.organisatie.parent.name}</div>
              )}
            </div>
            {a.study_level && <span className="text-xs text-muted-foreground capitalize shrink-0">{a.study_level}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OpleidingenPage() {
  const { opleidingen, upsertOpleiding } = useOpleidingen();
  const { scholen } = useScholen();
  const [search, setSearch] = useState("");
  const [filterField, setFilterField] = useState("all");
  const [filterStem, setFilterStem] = useState(false);
  const [filterNiveau, setFilterNiveau] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<Program | undefined>();
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { canEdit } = useAuth();
  const { sort, toggleSort } = useSort("name");
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever filters/search/sort change
  useEffect(() => { setPage(1); }, [search, filterField, filterStem, filterNiveau, sort.key, sort.direction]);

  // If currently selected field is not valid for chosen niveau, reset it
  useEffect(() => { setFilterField("all"); }, [filterNiveau]);

  const sortableKeys = new Set(["name", "field_of_study", "aantal_scholen"]);
  const sortKey = sortableKeys.has(sort.key) ? sort.key : "name";

  const { data: paged, isLoading } = useRichtingenPaged({
    page,
    pageSize: PAGE_SIZE,
    search,
    field: filterField,
    stemOnly: filterStem,
    niveau: filterNiveau,
    sortKey,
    sortDir: sort.direction,
  });

  const { data: fieldOptions = [] } = useRichtingFieldOptions(filterNiveau);

  const hasActiveFilter = search.trim().length > 0 || filterField !== "all" || filterStem || filterNiveau !== "all";

  const clearAll = () => { setSearch(""); setFilterField("all"); setFilterStem(false); setFilterNiveau("all"); };

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

  const exportCSV = useCallback(async () => {
    toast.loading("Export wordt voorbereid…", { id: "export-opl" });
    try {
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("opleidingen")
          .select("name, faculty, field_of_study, study_level, student_count, is_stem, organisatie:organisaties!organisatie_id(name, parent:organisaties!parent_id(name))")
          .order("name", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = (data ?? []) as any[];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      const headers = ["Opleiding", "Studiegebied", "Graad", "School", "Hoofdschool", "Faculteit", "Studenten", "STEM"];
      const csvRows = all.map((p) => [
        p.name ?? "", p.field_of_study ?? "", p.study_level ?? "",
        p.organisatie?.name ?? "", p.organisatie?.parent?.name ?? "",
        p.faculty ?? "", p.student_count ?? "", p.is_stem ? "ja" : "",
      ]);
      const escape = (v: any) => { const s = String(v ?? ""); return s.includes(";") || s.includes("\"") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
      const csv = [headers, ...csvRows].map((r) => r.map(escape).join(";")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "opleidingen_export.csv"; a.click();
      writeAuditLog({ action: "export", entity_type: "export", entity_id: "opleidingen-csv", entity_name: "Opleidingen export", changes: { row_count: all.length, format: "csv" } });
      toast.success(`${all.length} opleidingen geëxporteerd.`, { id: "export-opl" });
    } catch (e) {
      console.error(e);
      toast.error("Export mislukt.", { id: "export-opl" });
    }
  }, []);

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Opleidingen</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => void exportCSV()}><Download className="h-4 w-4 mr-1" /> Export</Button>
          {canEdit && <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" /> Import</Button>}
          {canEdit && <Button size="sm" className="h-10 sm:h-8" onClick={() => { setEditProgram(undefined); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nieuwe opleiding</Button>}
        </div>
      </div>

      <div className="surface-card p-3 sm:p-4 mb-4">
        <div className="space-y-3">
          <div className="relative w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Zoeken op richting of studiegebied..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 sm:h-9" /></div>
          <div className="flex flex-wrap gap-2">
            <Select value={filterNiveau} onValueChange={setFilterNiveau}><SelectTrigger className="w-[180px] h-10 sm:h-9"><SelectValue placeholder="Niveau" /></SelectTrigger><SelectContent><SelectItem value="all">Alle niveaus</SelectItem><SelectItem value="SO">Secundair</SelectItem><SelectItem value="HO">Hoger onderwijs</SelectItem></SelectContent></Select>
            <Select value={filterField} onValueChange={setFilterField}><SelectTrigger className="w-[220px] h-10 sm:h-9"><SelectValue placeholder="Studiegebied" /></SelectTrigger><SelectContent><SelectItem value="all">Alle studiegebieden</SelectItem>{fieldOptions.map((f) => <SelectItem key={f} value={f}>{formatStudiegebied(f)}</SelectItem>)}</SelectContent></Select>
            <Button type="button" variant={filterStem ? "default" : "outline"} size="sm" className="h-10 sm:h-9" aria-pressed={filterStem} onClick={() => setFilterStem((v) => !v)}>STEM</Button>
          </div>
          {hasActiveFilter && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
              <span className="text-xs text-muted-foreground">Actieve filters:</span>
              {search.trim() && <FilterChip label={`Zoeken: ${search.trim()}`} onClear={() => setSearch("")} />}
              {filterNiveau !== "all" && <FilterChip label={`Niveau: ${filterNiveau === "SO" ? "Secundair" : "Hoger onderwijs"}`} onClear={() => setFilterNiveau("all")} />}
              {filterField !== "all" && <FilterChip label={`Studiegebied: ${formatStudiegebied(filterField)}`} onClear={() => setFilterField("all")} />}
              {filterStem && <FilterChip label="STEM" onClear={() => setFilterStem(false)} />}
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAll}>Wis alle filters</Button>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{totalCount.toLocaleString("nl-BE")} unieke richting{totalCount !== 1 ? "en" : ""}</div>
        </div>
      </div>

      {isLoading ? <ListSkeleton /> : totalCount === 0 && !hasActiveFilter ? (
        <EmptyState icon={BookOpen} title="Nog geen opleidingen toegevoegd" description="Voeg je eerste opleiding toe." actionLabel="Nieuwe opleiding" onAction={() => { setEditProgram(undefined); setDialogOpen(true); }} />
      ) : (
        <>
          <div className="block md:hidden space-y-2">
            {rows.length === 0 ? <div className="surface-card p-6 text-center text-sm text-muted-foreground">Geen richtingen gevonden.</div> : rows.map((r) => {
              const isOpen = expandedName === r.name;
              return (
                <div key={r.name} className="surface-card overflow-hidden">
                  <div className="p-4 cursor-pointer active:scale-[0.99] transition-transform" onClick={() => setExpandedName(isOpen ? null : r.name)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm flex items-center gap-1.5 flex-wrap">{r.name}{r.is_stem && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 border-blue-200">STEM</Badge>}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatStudiegebied(r.field_of_study)}</p>
                        {r.graden?.length > 0 && <p className="text-[11px] text-muted-foreground">{r.graden.join(", ")}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">× {r.aantal_scholen} scholen</span>
                    </div>
                  </div>
                  {isOpen && <div className="border-t border-border"><AanbiedersList naam={r.name} field={r.field_of_study} niveau={r.niveau} /></div>}
                </div>
              );
            })}
            <div className="text-xs text-muted-foreground px-1 pt-2">{rangeFrom}-{rangeTo} van {totalCount} richting{totalCount !== 1 ? "en" : ""}</div>
          </div>

          <div className="surface-card overflow-hidden hidden md:block">
            <Table><TableHeader><TableRow>
              <TableHead className="w-8"></TableHead>
              <SortableTableHead sortKey="name" currentSort={sort} onSort={toggleSort}>Opleiding</SortableTableHead>
              <SortableTableHead sortKey="field_of_study" currentSort={sort} onSort={toggleSort}>Studiegebied</SortableTableHead>
              <TableHead>Graden</TableHead>
              <SortableTableHead sortKey="aantal_scholen" currentSort={sort} onSort={toggleSort} className="text-right">Scholen</SortableTableHead>
            </TableRow></TableHeader>
              <TableBody>{rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Geen richtingen gevonden.</TableCell></TableRow> : rows.map((r) => {
                const isOpen = expandedName === r.name;
                return (
                  <Fragment key={r.name}>
                    <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedName(isOpen ? null : r.name)}>
                      <TableCell className="px-2">{isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}</TableCell>
                      <TableCell className="font-medium"><div className="flex items-center gap-1.5 flex-wrap"><span>{r.name}</span>{r.is_stem && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 border-blue-200">STEM</Badge>}</div></TableCell>
                      <TableCell>{formatStudiegebied(r.field_of_study)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.graden?.join(", ") ?? ""}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">× {r.aantal_scholen} scholen</TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow><TableCell colSpan={5} className="bg-muted/20 p-0"><AanbiedersList naam={r.name} field={r.field_of_study} niveau={r.niveau} /></TableCell></TableRow>
                    )}
                  </Fragment>
                );
              })}</TableBody></Table>
            <div className="p-3 border-t border-border text-xs text-muted-foreground">{rangeFrom}-{rangeTo} van {totalCount} richting{totalCount !== 1 ? "en" : ""}</div>
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
