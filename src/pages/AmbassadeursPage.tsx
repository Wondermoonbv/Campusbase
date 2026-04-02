import { useState, useMemo, useCallback, memo } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useAmbassadeurs, useAllInschrijvingen } from "@/hooks/useAmbassadeurs";
import type { Ambassadeur } from "@/hooks/useAmbassadeurs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { AmbassadeurFormDialog } from "@/components/ambassadeurs/AmbassadeurFormDialog";
import { ImportDialog, ImportColumn } from "@/components/import/ImportDialog";
import { Search, Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import { toast } from "sonner";

const AMB_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "full_name", label: "Naam", required: true },
  { key: "email", label: "Email", required: true, validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Ongeldig emailadres" },
  { key: "phone", label: "Telefoon" },
  { key: "department", label: "Afdeling" },
  { key: "notes", label: "Notities" },
];

const AmbassadeurMobileCard = memo(function AmbassadeurMobileCard({
  amb, confirmedCount, canEdit, onEdit, onDelete,
}: {
  amb: Ambassadeur; confirmedCount: number; canEdit: boolean;
  onEdit: (a: Ambassadeur) => void; onDelete: (a: Ambassadeur) => void;
}) {
  return (
    <div className="surface-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{amb.full_name}</span>
        <StatusBadge status={amb.is_active ? "actief" : "inactief"} />
      </div>
      <p className="text-xs text-muted-foreground">{amb.email}</p>
      {amb.department && <p className="text-xs text-muted-foreground">{amb.department}</p>}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">{confirmedCount} events bevestigd</span>
        {canEdit && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(amb)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(amb)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      </div>
    </div>
  );
});

const AmbassadeurTableRow = memo(function AmbassadeurTableRow({
  amb, confirmedCount, canEdit, onEdit, onDelete,
}: {
  amb: Ambassadeur; confirmedCount: number; canEdit: boolean;
  onEdit: (a: Ambassadeur) => void; onDelete: (a: Ambassadeur) => void;
}) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-medium">{amb.full_name}</td>
      <td className="px-4 py-3 text-muted-foreground">{amb.email}</td>
      <td className="px-4 py-3 text-muted-foreground">{amb.department || "—"}</td>
      <td className="px-4 py-3 text-center tabular-nums">{confirmedCount}</td>
      <td className="px-4 py-3"><StatusBadge status={amb.is_active ? "actief" : "inactief"} /></td>
      {canEdit && (
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(amb)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(amb)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </td>
      )}
    </tr>
  );
});

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="surface-card p-4 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function AmbassadeursPage() {
  const { canEdit } = useAuth();
  const { ambassadeurs, isLoading, upsertAmbassadeur, deleteAmbassadeur } = useAmbassadeurs();
  const { inschrijvingen } = useAllInschrijvingen();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ambassadeur | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ambassadeur | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const confirmedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    inschrijvingen.forEach((i) => {
      if (i.status === "bevestigd") counts[i.ambassadeur_id] = (counts[i.ambassadeur_id] || 0) + 1;
    });
    return counts;
  }, [inschrijvingen]);

  const filtered = useMemo(() => {
    return ambassadeurs.filter((a) => {
      const q = search.toLowerCase();
      if (q && !a.full_name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q)) return false;
      if (statusFilter === "actief" && !a.is_active) return false;
      if (statusFilter === "inactief" && a.is_active) return false;
      return true;
    });
  }, [ambassadeurs, search, statusFilter]);

  const handleSave = useCallback(async (amb: Partial<Ambassadeur> & { full_name: string; email: string }) => {
    try {
      await upsertAmbassadeur.mutateAsync(amb);
      toast.success(amb.id ? "Ambassadeur bijgewerkt" : "Ambassadeur toegevoegd");
      setDialogOpen(false);
      setEditing(null);
    } catch {
      toast.error("Fout bij opslaan");
    }
  }, [upsertAmbassadeur]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteAmbassadeur.mutateAsync({ id: deleteTarget.id, name: deleteTarget.full_name });
      toast.success("Ambassadeur verwijderd");
      setDeleteTarget(null);
    } catch (err: any) {
      if (err?.code === "23503") {
        toast.error("Kan niet verwijderen: ambassadeur heeft nog inschrijvingen");
      } else {
        toast.error("Fout bij verwijderen");
      }
    }
  }, [deleteTarget, deleteAmbassadeur]);

  const handleEdit = useCallback((a: Ambassadeur) => { setEditing(a); setDialogOpen(true); }, []);
  const handleDeleteClick = useCallback((a: Ambassadeur) => setDeleteTarget(a), []);

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Ambassadeurs</h1>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Ambassadeur toevoegen
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Zoek op naam of email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle</SelectItem>
            <SelectItem value="actief">Actief</SelectItem>
            <SelectItem value="inactief">Inactief</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <ListSkeleton /> : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {filtered.map((a) => (
              <AmbassadeurMobileCard
                key={a.id}
                amb={a}
                confirmedCount={confirmedCounts[a.id] ?? 0}
                canEdit={canEdit}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block surface-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Naam</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Afdeling</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">Events</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  {canEdit && <th className="px-4 py-3 font-medium text-muted-foreground text-right">Acties</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((a) => (
                  <AmbassadeurTableRow
                    key={a.id}
                    amb={a}
                    confirmedCount={confirmedCounts[a.id] ?? 0}
                    canEdit={canEdit}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Geen ambassadeurs gevonden.</p>
            )}
          </div>
        </>
      )}

      <AmbassadeurFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}
        ambassadeur={editing}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={deleteTarget?.full_name ?? ""}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Ambassadeurs importeren"
        columns={AMB_IMPORT_COLUMNS}
        templateFilename="ambassadeurs_template.xlsx"
        duplicateCheck={{ keys: ["email"], existingData: ambassadeurs.map((a) => ({ email: a.email })) }}
        onImport={async (rows) => {
          for (const row of rows) {
            await upsertAmbassadeur.mutateAsync({
              full_name: row.full_name,
              email: row.email,
              phone: row.phone || "",
              department: row.department || "",
              notes: row.notes || "",
              is_active: true,
            });
          }
        }}
      />
    </div>
  );
}
