import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAmbassadeurs, useAllInschrijvingen } from "@/hooks/useAmbassadeurs";
import type { Ambassadeur } from "@/hooks/useAmbassadeurs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { AmbassadeurFormDialog } from "@/components/ambassadeurs/AmbassadeurFormDialog";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AmbassadeursPage() {
  const { canEdit } = useAuth();
  const { ambassadeurs, upsertAmbassadeur, deleteAmbassadeur } = useAmbassadeurs();
  const { inschrijvingen } = useAllInschrijvingen();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ambassadeur | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ambassadeur | null>(null);

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

  const handleSave = async (amb: Partial<Ambassadeur> & { full_name: string; email: string }) => {
    try {
      await upsertAmbassadeur.mutateAsync(amb);
      toast.success(amb.id ? "Ambassadeur bijgewerkt" : "Ambassadeur toegevoegd");
      setDialogOpen(false);
      setEditing(null);
    } catch {
      toast.error("Fout bij opslaan");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAmbassadeur.mutateAsync(deleteTarget.id);
      toast.success("Ambassadeur verwijderd");
      setDeleteTarget(null);
    } catch (err: any) {
      if (err?.code === "23503") {
        toast.error("Kan niet verwijderen: ambassadeur heeft nog inschrijvingen");
      } else {
        toast.error("Fout bij verwijderen");
      }
    }
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Ambassadeurs</h1>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Ambassadeur toevoegen
          </Button>
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

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map((a) => (
          <div key={a.id} className="surface-card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{a.full_name}</span>
              <StatusBadge status={a.is_active ? "actief" : "inactief"} />
            </div>
            <p className="text-xs text-muted-foreground">{a.email}</p>
            {a.department && <p className="text-xs text-muted-foreground">{a.department}</p>}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">{confirmedCounts[a.id] ?? 0} events bevestigd</span>
              {canEdit && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(a); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </div>
          </div>
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
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{a.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.department || "—"}</td>
                <td className="px-4 py-3 text-center tabular-nums">{confirmedCounts[a.id] ?? 0}</td>
                <td className="px-4 py-3"><StatusBadge status={a.is_active ? "actief" : "inactief"} /></td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(a); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Geen ambassadeurs gevonden.</p>
        )}
      </div>

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
    </div>
  );
}
