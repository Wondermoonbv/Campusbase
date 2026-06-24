import { useState, useMemo, useCallback, useEffect } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useScholen,
  useContacten,
  useOrganisatieTypeCounts,
  useOrganisatiesPaged,
  useSchoolTypeOptions,
  useSchoolbestuurSearch,
  useScholengemeenschapSearch,
} from "@/hooks/useScholen";
import { SearchableComboFilter } from "@/components/organisaties/SearchableComboFilter";
import { School, PROVINCES, OrganisatieType } from "@/types/crm";
import { writeAuditLog } from "@/lib/audit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Download, Pencil, Upload, Trash2, Building2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { SchoolFormDialog } from "@/components/schools/SchoolFormDialog";
import { ImportDialog, ImportColumn } from "@/components/import/ImportDialog";
import { SortableTableHead, useSort } from "@/components/ui/SortableTableHead";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import { toast } from "sonner";
import { capitalize } from "@/lib/utils";

const ORGANISATIE_TYPE_LABELS: Record<OrganisatieType, string> = {
  school: "School",
  studentenvereniging: "Studentenvereniging",
  werkgeversorganisatie: "Werkgeversorganisatie",
  overheid: "Overheid",
  andere: "Andere",
};

const ORGANISATIE_TYPES: OrganisatieType[] = ["school", "studentenvereniging", "werkgeversorganisatie", "overheid", "andere"];

const SCHOOL_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Naam", required: true },
  { key: "type", label: "Type", required: true, validate: (v) => ["school", "studentenvereniging", "werkgeversorganisatie", "overheid", "andere"].includes(v.toLowerCase()) ? null : "Moet school, studentenvereniging, werkgeversorganisatie, overheid of andere zijn" },
  { key: "schooltype", label: "Schooltype", validate: (v) => !v || ["universiteit", "hogeschool", "secundair"].includes(v.toLowerCase()) ? null : "Moet universiteit, hogeschool of secundair zijn" },
  { key: "city", label: "Stad", required: true },
  { key: "province", label: "Provincie", required: true, validate: (v) => PROVINCES.includes(v) ? null : "Ongeldige provincie" },
  { key: "language", label: "Taal", required: true, validate: (v) => ["NL", "FR", "EN"].includes(v.toUpperCase()) ? null : "Moet NL, FR of EN zijn" },
  { key: "status", label: "Status", validate: (v) => !v || ["actief", "inactief", "prospect"].includes(v.toLowerCase()) ? null : "Moet actief, inactief of prospect zijn" },
  { key: "website", label: "Website" },
  { key: "notes", label: "Notities" },
  { key: "hoofdorganisatie", label: "Hoofdorganisatie" },
];

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="surface-card p-4 space-y-2">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
      <span className="truncate max-w-[220px]">{label}</span>
      <button
        type="button"
        aria-label={`${label} verwijderen`}
        onClick={onClear}
        className="hover:text-foreground text-muted-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export default function OrganisatiesPage() {
  const [searchParams] = useSearchParams();
  const { scholen, isLoading, upsertSchool, deleteSchool } = useScholen();
  const { contacten } = useContacten();
  const [search, setSearch] = useState("");
  const [filterOrgType, setFilterOrgType] = useState<string>("all");
  const [filterProvince, setFilterProvince] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get("status") ?? "all");
  const [filterNiveau, setFilterNiveau] = useState<string>("all");
  const [filterSchoolType, setFilterSchoolType] = useState<string>("all");
  const [filterSchoolbestuurNr, setFilterSchoolbestuurNr] = useState<string>("");
  const [filterSchoolbestuurLabel, setFilterSchoolbestuurLabel] = useState<string>("");
  const [filterScholengemNr, setFilterScholengemNr] = useState<string>("");
  const [filterScholengemLabel, setFilterScholengemLabel] = useState<string>("");
  const [schoolbestuurTerm, setSchoolbestuurTerm] = useState<string>("");
  const [scholengemTerm, setScholengemTerm] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editSchool, setEditSchool] = useState<School | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { sort, toggleSort } = useSort("name");

  const handleSave = useCallback(async (saved: School) => {
    try { await upsertSchool.mutateAsync(saved); } catch { toast.error("Fout bij opslaan."); }
  }, [upsertSchool]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteSchool.mutateAsync({ id: deleteTarget.id, name: deleteTarget.name });
      toast.success("Organisatie verwijderd.");
    } catch (error) {
      handleDeleteError(error, "organisatie");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteSchool]);

  const { data: typeCountsData } = useOrganisatieTypeCounts();
  const typeCounts = typeCountsData ?? { all: 0 };

  const hasActiveFilter = useMemo(() =>
    search.trim().length > 0
    || filterOrgType !== "all"
    || filterProvince !== "all"
    || filterLanguage !== "all"
    || filterStatus !== "all"
    || filterNiveau !== "all"
    || filterSchoolType !== "all"
    || !!filterSchoolbestuurNr
    || !!filterScholengemNr
  , [search, filterOrgType, filterProvince, filterLanguage, filterStatus, filterNiveau, filterSchoolType, filterSchoolbestuurNr, filterScholengemNr]);

  // Reset to page 1 whenever filters or sort change
  useEffect(() => { setPage(1); }, [search, filterOrgType, filterProvince, filterLanguage, filterStatus, filterNiveau, filterSchoolType, filterSchoolbestuurNr, filterScholengemNr, sort.key, sort.direction]);

  const { data: paged, isLoading: pagedLoading } = useOrganisatiesPaged({
    page,
    pageSize: PAGE_SIZE,
    search,
    orgType: filterOrgType,
    province: filterProvince,
    language: filterLanguage,
    status: filterStatus,
    sortKey: sort.key,
    sortDir: sort.direction,
    hierarchical: !hasActiveFilter,
    niveau: filterNiveau,
    schoolType: filterSchoolType,
    schoolbestuurNr: filterSchoolbestuurNr,
    scholengemeenschapNr: filterScholengemNr,
  });

  const { data: schoolTypeOptions = [] } = useSchoolTypeOptions();
  const { data: schoolbestuurOptions = [], isFetching: sbLoading } = useSchoolbestuurSearch(schoolbestuurTerm);
  const { data: scholengemOptions = [], isFetching: sgLoading } = useScholengemeenschapSearch(scholengemTerm);

  const totalCount = paged?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const contactMap = useMemo(() => {
    const map = new Map<string, typeof contacten[0]>();
    contacten.forEach((c) => { if (c.organisatie_id && !map.has(c.organisatie_id)) map.set(c.organisatie_id, c); });
    return map;
  }, [contacten]);

  const displayRows = useMemo(() => {
    const rows: { type: "head" | "campus" | "flat"; org: any; parentName?: string | null; verbondenName?: string | null }[] = [];
    const pagedRows = paged?.rows ?? [];
    if (hasActiveFilter) {
      pagedRows.forEach((org: any) => rows.push({
        type: "flat",
        org,
        parentName: org.parent?.name ?? null,
        verbondenName: org.verbonden_instelling?.name ?? null,
      }));
    } else {
      const campusesByParent = paged?.campusesByParent ?? {};
      pagedRows.forEach((head: any) => {
        rows.push({ type: "head", org: head, parentName: null, verbondenName: head.verbonden_instelling?.name ?? null });
        (campusesByParent[head.id] ?? []).forEach((c: any) => {
          rows.push({ type: "campus", org: c, parentName: head.name, verbondenName: c.verbonden_instelling?.name ?? null });
        });
      });
    }
    return rows;
  }, [paged, hasActiveFilter]);

  const exportCSV = useCallback(() => {
    const headers = ["Naam", "Type", "Stad", "Provincie", "Taal", "Status", "Contact", "Email"];
    const rows = (paged?.rows ?? []).map((s: any) => {
      const contact = contactMap.get(s.id);
      return [s.name, ORGANISATIE_TYPE_LABELS[s.type] || s.type, s.city || "", s.province || "", s.language || "", s.status, contact?.name || "", contact?.email || ""];
    });
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "organisaties_export.csv"; a.click();
    writeAuditLog({ action: "export", entity_type: "export", entity_id: "organisaties-csv", entity_name: "Organisaties export", changes: { row_count: rows.length, format: "csv" } });
  }, [paged, contactMap]);

  const rangeFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, totalCount);
  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    const max = totalPages;
    const start = Math.max(1, page - 2);
    const end = Math.min(max, start + 4);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [page, totalPages]);

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Organisaties</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
          {canEdit && <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" /> Import</Button>}
          {canEdit && <Button size="sm" className="h-10 sm:h-8" onClick={() => { setEditSchool(undefined); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Organisatie toevoegen</Button>}
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="mb-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 min-w-max">
          <button
            onClick={() => setFilterOrgType("all")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filterOrgType === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            Alle ({typeCounts.all ?? 0})
          </button>
          {ORGANISATIE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilterOrgType(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filterOrgType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {ORGANISATIE_TYPE_LABELS[t]} ({typeCounts[t] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="surface-card p-3 sm:p-4 mb-4 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Zoeken op naam, stad, contact..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 sm:h-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterProvince} onValueChange={setFilterProvince}><SelectTrigger className="w-[180px] h-10 sm:h-9"><SelectValue placeholder="Provincie" /></SelectTrigger><SelectContent><SelectItem value="all">Alle provincies</SelectItem>{PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
          <Select value={filterLanguage} onValueChange={setFilterLanguage}><SelectTrigger className="w-[120px] h-10 sm:h-9"><SelectValue placeholder="Taal" /></SelectTrigger><SelectContent><SelectItem value="all">Alle talen</SelectItem><SelectItem value="NL">NL</SelectItem><SelectItem value="FR">FR</SelectItem><SelectItem value="EN">EN</SelectItem></SelectContent></Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[140px] h-10 sm:h-9"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Alle statussen</SelectItem><SelectItem value="actief">Actief</SelectItem><SelectItem value="inactief">Inactief</SelectItem><SelectItem value="prospect">Prospect</SelectItem></SelectContent></Select>
          <Select value={filterNiveau} onValueChange={setFilterNiveau}><SelectTrigger className="w-[160px] h-10 sm:h-9"><SelectValue placeholder="Niveau" /></SelectTrigger><SelectContent><SelectItem value="all">Alle niveaus</SelectItem><SelectItem value="HO">Hoger onderwijs</SelectItem><SelectItem value="SO">Secundair</SelectItem></SelectContent></Select>
          <Select value={filterSchoolType} onValueChange={setFilterSchoolType}><SelectTrigger className="w-[180px] h-10 sm:h-9"><SelectValue placeholder="Schooltype" /></SelectTrigger><SelectContent><SelectItem value="all">Alle schooltypes</SelectItem>{schoolTypeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          <SearchableComboFilter
            className="w-[220px]"
            value={filterSchoolbestuurNr}
            selectedLabel={filterSchoolbestuurLabel}
            placeholder="Schoolbestuur"
            onSearchChange={setSchoolbestuurTerm}
            options={schoolbestuurOptions}
            isLoading={sbLoading}
            onChange={(nr, name) => { setFilterSchoolbestuurNr(nr); setFilterSchoolbestuurLabel(name); }}
          />
          <SearchableComboFilter
            className="w-[220px]"
            value={filterScholengemNr}
            selectedLabel={filterScholengemLabel}
            placeholder="Scholengemeenschap"
            onSearchChange={setScholengemTerm}
            options={scholengemOptions}
            isLoading={sgLoading}
            onChange={(nr, name) => { setFilterScholengemNr(nr); setFilterScholengemLabel(name); }}
          />
        </div>
        {hasActiveFilter && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
            <span className="text-xs text-muted-foreground">Actieve filters:</span>
            {search.trim() && <FilterChip label={`Zoeken: ${search.trim()}`} onClear={() => setSearch("")} />}
            {filterProvince !== "all" && <FilterChip label={`Provincie: ${filterProvince}`} onClear={() => setFilterProvince("all")} />}
            {filterLanguage !== "all" && <FilterChip label={`Taal: ${filterLanguage}`} onClear={() => setFilterLanguage("all")} />}
            {filterStatus !== "all" && <FilterChip label={`Status: ${filterStatus}`} onClear={() => setFilterStatus("all")} />}
            {filterNiveau !== "all" && <FilterChip label={`Niveau: ${filterNiveau === "HO" ? "Hoger onderwijs" : "Secundair"}`} onClear={() => setFilterNiveau("all")} />}
            {filterSchoolType !== "all" && <FilterChip label={`Schooltype: ${filterSchoolType}`} onClear={() => setFilterSchoolType("all")} />}
            {filterSchoolbestuurNr && <FilterChip label={`Schoolbestuur: ${filterSchoolbestuurLabel || filterSchoolbestuurNr}`} onClear={() => { setFilterSchoolbestuurNr(""); setFilterSchoolbestuurLabel(""); }} />}
            {filterScholengemNr && <FilterChip label={`Scholengemeenschap: ${filterScholengemLabel || filterScholengemNr}`} onClear={() => { setFilterScholengemNr(""); setFilterScholengemLabel(""); }} />}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setSearch("");
                setFilterProvince("all");
                setFilterLanguage("all");
                setFilterStatus("all");
                setFilterNiveau("all");
                setFilterSchoolType("all");
                setFilterSchoolbestuurNr(""); setFilterSchoolbestuurLabel("");
                setFilterScholengemNr(""); setFilterScholengemLabel("");
              }}
            >
              Wis alle filters
            </Button>
          </div>
        )}
      </div>

      {isLoading || pagedLoading ? <ListSkeleton /> : totalCount === 0 && !hasActiveFilter ? (
        <EmptyState icon={Building2} title="Nog geen organisaties toegevoegd" description="Voeg je eerste organisatie toe om te beginnen." actionLabel="Organisatie toevoegen" onAction={() => { setEditSchool(undefined); setDialogOpen(true); }} />
      ) : (
        <>
          <div className="block md:hidden space-y-2">
            {displayRows.length === 0 ? <div className="surface-card p-6 text-center text-sm text-muted-foreground">Geen organisaties gevonden.</div> : displayRows.map(({ type, org, parentName, verbondenName }) => (
              <div key={org.id} className="surface-card p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/organisaties/${org.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`font-medium text-sm truncate ${type === "campus" ? "pl-4" : ""}`}>{type === "campus" ? "↳ " : ""}{org.name}</p>
                      {org.type === "studentenvereniging" && org.is_nationaal && (
                        <Badge variant="outline" className="text-[10px]">Nationaal</Badge>
                      )}
                    </div>
                    {parentName && (
                      <p className="text-xs text-muted-foreground mt-0.5">onder {parentName}</p>
                    )}
                    {org.type === "studentenvereniging" && verbondenName && (
                      <p className="text-xs text-muted-foreground mt-0.5">verbonden aan {verbondenName}</p>
                    )}
                    {org.schoolbestuur && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {org.schoolbestuur}
                        {org.scholengemeenschap ? ` · ${org.scholengemeenschap}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{ORGANISATIE_TYPE_LABELS[org.type]} · {org.city || "—"} · {org.language || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={org.status} />
                    {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`${org.name} verwijderen`} onClick={(e) => { e.stopPropagation(); setDeleteTarget(org); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                  </div>
                </div>
                {contactMap.get(org.id) && <p className="text-xs text-muted-foreground mt-2">{contactMap.get(org.id)?.name}</p>}
              </div>
            ))}
            <div className="text-xs text-muted-foreground px-1 pt-2">{rangeFrom}-{rangeTo} van {totalCount}</div>
          </div>

          <div className="surface-card overflow-hidden hidden md:block">
            <Table>
              <TableHeader><TableRow>
                <SortableTableHead sortKey="name" currentSort={sort} onSort={toggleSort}>Naam</SortableTableHead>
                <SortableTableHead sortKey="type" currentSort={sort} onSort={toggleSort}>Type</SortableTableHead>
                <SortableTableHead sortKey="city" currentSort={sort} onSort={toggleSort}>Stad</SortableTableHead>
                <SortableTableHead sortKey="province" currentSort={sort} onSort={toggleSort} className="hidden lg:table-cell">Provincie</SortableTableHead>
                <SortableTableHead sortKey="language" currentSort={sort} onSort={toggleSort}>Taal</SortableTableHead>
                <SortableTableHead sortKey="status" currentSort={sort} onSort={toggleSort}>Status</SortableTableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead className="w-20" />
              </TableRow></TableHeader>
              <TableBody>
                {displayRows.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen organisaties gevonden.</TableCell></TableRow> : displayRows.map(({ type, org, parentName, verbondenName }) => (
                  <TableRow key={org.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/organisaties/${org.id}`)}>
                    <TableCell className={`font-medium ${type === "campus" ? "pl-8" : ""}`}>
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-2">
                          {type === "campus" ? "↳ " : ""}{org.name}
                          {org.parent_id ? (
                            <Badge variant="secondary" className="text-[10px]">Campus</Badge>
                          ) : (org.childCount ?? 0) > 0 ? (
                            <Badge variant="outline" className="text-[10px]">
                              Hoofd · {org.childCount} campus{org.childCount === 1 ? "" : "sen"}
                            </Badge>
                          ) : null}
                          {org.type === "studentenvereniging" && org.is_nationaal && (
                            <Badge variant="outline" className="text-[10px]">Nationaal</Badge>
                          )}
                        </span>
                        {parentName && (
                          <span className="text-xs text-muted-foreground mt-0.5">onder {parentName}</span>
                        )}
                        {org.type === "studentenvereniging" && verbondenName && (
                          <span className="text-xs text-muted-foreground mt-0.5">verbonden aan {verbondenName}</span>
                        )}
                        {org.schoolbestuur && (
                          <span className="text-xs text-muted-foreground mt-0.5 truncate">
                            {org.schoolbestuur}
                            {org.scholengemeenschap ? ` · ${org.scholengemeenschap}` : ""}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{ORGANISATIE_TYPE_LABELS[org.type] || org.type}</TableCell>
                    <TableCell>{org.city || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{org.province || "—"}</TableCell>
                    <TableCell>{org.language || "—"}</TableCell>
                    <TableCell><StatusBadge status={org.status} /></TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{contactMap.get(org.id)?.name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${org.name} bewerken`} onClick={(e) => { e.stopPropagation(); setEditSchool(org); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>}
                        {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${org.name} verwijderen`} onClick={(e) => { e.stopPropagation(); setDeleteTarget(org); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-3 border-t border-border text-xs text-muted-foreground">{rangeFrom}-{rangeTo} van {totalCount} organisatie{totalCount !== 1 ? "s" : ""}</div>
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

      <SchoolFormDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditSchool(undefined); }} school={editSchool} onSave={handleSave} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Scholen importeren"
        columns={SCHOOL_IMPORT_COLUMNS}
        templateFilename="scholen_template.xlsx"
        duplicateCheck={{ keys: ["name", "city"], existingData: scholen.map((s) => ({ name: s.name, city: s.city })) }}
        onImport={async (rows) => {
          const buildPayload = (row: any, parent_id: string | null) => ({
            name: row.name,
            type: (row.type?.toLowerCase() || "school") as any,
            school_type: (row.schooltype?.toLowerCase() || "") as any,
            city: row.city,
            province: row.province,
            language: (row.language?.toUpperCase() || "NL") as any,
            status: (row.status?.toLowerCase() || "actief") as any,
            website: row.website || "",
            notes: row.notes || "",
            parent_id,
          });

          const parents = rows.filter((r) => !r.hoofdorganisatie?.trim());
          const children = rows.filter((r) => r.hoofdorganisatie?.trim());

          // Pass 1: parents
          const nameToId = new Map<string, string>();
          for (const s of scholen) nameToId.set(s.name.toLowerCase(), s.id);

          for (const row of parents) {
            const result = await upsertSchool.mutateAsync(buildPayload(row, null));
            nameToId.set(row.name.toLowerCase(), result.data.id);
          }

          // Pass 2: children
          for (const row of children) {
            const parentName = row.hoofdorganisatie.trim().toLowerCase();
            const parentId = nameToId.get(parentName);
            if (!parentId) {
              toast.error(`Hoofdorganisatie "${row.hoofdorganisatie}" niet gevonden voor "${row.name}" — overgeslagen.`);
              continue;
            }
            await upsertSchool.mutateAsync(buildPayload(row, parentId));
          }
        }}
      />
      <DeleteConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} itemName={deleteTarget?.name ?? ""} isLoading={deleteSchool.isPending} />
    </div>
  );
}
