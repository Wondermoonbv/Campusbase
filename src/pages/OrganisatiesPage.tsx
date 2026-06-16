import { useState, useMemo, useCallback } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useScholen, useContacten } from "@/hooks/useScholen";
import { School, PROVINCES, OrganisatieType } from "@/types/crm";
import { writeAuditLog } from "@/lib/audit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Download, Pencil, Upload, Trash2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { SchoolFormDialog } from "@/components/schools/SchoolFormDialog";
import { ImportDialog, ImportColumn } from "@/components/import/ImportDialog";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import { toast } from "sonner";

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
  { key: "type", label: "Type", required: true, validate: (v) => ["universiteit", "hogeschool", "secundair"].includes(v.toLowerCase()) ? null : "Moet universiteit, hogeschool of secundair zijn" },
  { key: "city", label: "Stad", required: true },
  { key: "province", label: "Provincie", required: true, validate: (v) => PROVINCES.includes(v) ? null : "Ongeldige provincie" },
  { key: "language", label: "Taal", required: true, validate: (v) => ["NL", "FR", "EN"].includes(v.toUpperCase()) ? null : "Moet NL, FR of EN zijn" },
  { key: "status", label: "Status", validate: (v) => !v || ["actief", "inactief", "prospect"].includes(v.toLowerCase()) ? null : "Moet actief, inactief of prospect zijn" },
  { key: "website", label: "Website" },
  { key: "notes", label: "Notities" },
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

export default function OrganisatiesPage() {
  const [searchParams] = useSearchParams();
  const { scholen, isLoading, upsertSchool, deleteSchool } = useScholen();
  const { contacten } = useContacten();
  const [search, setSearch] = useState("");
  const [filterOrgType, setFilterOrgType] = useState<string>("all");
  const [filterProvince, setFilterProvince] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get("status") ?? "all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editSchool, setEditSchool] = useState<School | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
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

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: scholen.length };
    ORGANISATIE_TYPES.forEach(t => { counts[t] = scholen.filter(s => s.type === t).length; });
    return counts;
  }, [scholen]);

  const filtered = useMemo(() => {
    return scholen.filter((s) => {
      const orgContacts = contacten.filter(c => c.organisatie_id === s.id);
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.city || "").toLowerCase().includes(search.toLowerCase()) ||
        orgContacts.some(c => c.name.toLowerCase().includes(search.toLowerCase()));
      const matchesType = filterOrgType === "all" || s.type === filterOrgType;
      const matchesProvince = filterProvince === "all" || s.province === filterProvince;
      const matchesLanguage = filterLanguage === "all" || s.language === filterLanguage;
      const matchesStatus = filterStatus === "all" || s.status === filterStatus;
      return matchesSearch && matchesType && matchesProvince && matchesLanguage && matchesStatus;
    });
  }, [scholen, contacten, search, filterOrgType, filterProvince, filterLanguage, filterStatus]);

  const sorted = useMemo(() => sortItems(filtered, sort, (s, key) => {
    switch (key) {
      case "name": return s.name; case "type": return s.type; case "city": return s.city;
      case "province": return s.province; case "language": return s.language; case "status": return s.status;
      default: return s.name;
    }
  }), [filtered, sort]);

  const contactMap = useMemo(() => {
    const map = new Map<string, typeof contacten[0]>();
    contacten.forEach((c) => { if (c.organisatie_id && !map.has(c.organisatie_id)) map.set(c.organisatie_id, c); });
    return map;
  }, [contacten]);

  const parentMap = useMemo(() => {
    const map = new Map<string, string>();
    scholen.forEach((s) => { map.set(s.id, s.name); });
    return map;
  }, [scholen]);

  const exportCSV = useCallback(() => {
    const headers = ["Naam", "Type", "Stad", "Provincie", "Taal", "Status", "Contact", "Email"];
    const rows = sorted.map((s) => {
      const contact = contactMap.get(s.id);
      return [s.name, ORGANISATIE_TYPE_LABELS[s.type] || s.type, s.city || "", s.province || "", s.language || "", s.status, contact?.name || "", contact?.email || ""];
    });
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "organisaties_export.csv"; a.click();
    writeAuditLog({ action: "export", entity_type: "export", entity_id: "organisaties-csv", entity_name: "Organisaties export", changes: { row_count: rows.length, format: "csv" } });
  }, [sorted, contactMap]);

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
            Alle ({typeCounts.all})
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

      <div className="surface-card p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoeken op naam, stad, contact..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 sm:h-9" />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <Select value={filterProvince} onValueChange={setFilterProvince}><SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9"><SelectValue placeholder="Provincie" /></SelectTrigger><SelectContent><SelectItem value="all">Alle provincies</SelectItem>{PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            <Select value={filterLanguage} onValueChange={setFilterLanguage}><SelectTrigger className="w-full sm:w-[120px] h-10 sm:h-9"><SelectValue placeholder="Taal" /></SelectTrigger><SelectContent><SelectItem value="all">Alle talen</SelectItem><SelectItem value="NL">NL</SelectItem><SelectItem value="FR">FR</SelectItem><SelectItem value="EN">EN</SelectItem></SelectContent></Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-full sm:w-[140px] h-10 sm:h-9"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Alle statussen</SelectItem><SelectItem value="actief">Actief</SelectItem><SelectItem value="inactief">Inactief</SelectItem><SelectItem value="prospect">Prospect</SelectItem></SelectContent></Select>
          </div>
        </div>
      </div>

      {isLoading ? <ListSkeleton /> : scholen.length === 0 ? (
        <EmptyState icon={Building2} title="Nog geen organisaties toegevoegd" description="Voeg je eerste organisatie toe om te beginnen." actionLabel="Organisatie toevoegen" onAction={() => { setEditSchool(undefined); setDialogOpen(true); }} />
      ) : (
        <>
          <div className="block md:hidden space-y-2">
            {sorted.length === 0 ? <div className="surface-card p-6 text-center text-sm text-muted-foreground">Geen organisaties gevonden.</div> : sorted.map((org) => (
              <div key={org.id} className="surface-card p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/organisaties/${org.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{org.name}</p>
                    {org.parent_id && parentMap.get(org.parent_id) && (
                      <p className="text-xs text-muted-foreground mt-0.5">onder {parentMap.get(org.parent_id)}</p>
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
            <div className="text-xs text-muted-foreground px-1 pt-2">{sorted.length} organisatie{sorted.length !== 1 ? "s" : ""} gevonden</div>
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
                {sorted.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen organisaties gevonden.</TableCell></TableRow> : sorted.map((org) => (
                  <TableRow key={org.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/organisaties/${org.id}`)}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-2">
                          {org.name}
                          {org.parent_id ? (
                            <Badge variant="secondary" className="text-[10px]">Campus</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Hoofd</Badge>
                          )}
                        </span>
                        {org.parent_id && parentMap.get(org.parent_id) && (
                          <span className="text-xs text-muted-foreground mt-0.5">onder {parentMap.get(org.parent_id)}</span>
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
            <div className="p-3 border-t border-border text-xs text-muted-foreground">{sorted.length} organisatie{sorted.length !== 1 ? "s" : ""} gevonden</div>
          </div>
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
          for (const row of rows) {
            await upsertSchool.mutateAsync({
              name: row.name,
              type: "school" as any,
              school_type: (row.type?.toLowerCase() || "universiteit") as any,
              city: row.city,
              province: row.province,
              language: (row.language?.toUpperCase() || "NL") as any,
              status: (row.status?.toLowerCase() || "actief") as any,
              website: row.website || "",
              notes: row.notes || "",
            });
          }
        }}
      />
      <DeleteConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} itemName={deleteTarget?.name ?? ""} isLoading={deleteSchool.isPending} />
    </div>
  );
}
