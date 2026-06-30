import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Gift } from "lucide-react";
import { useContractDeliverables, useDeliverableTypes, type ContractDeliverable } from "@/hooks/useContractDeliverables";
import { ContractDeliverableDialog } from "./ContractDeliverableDialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function formatDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
}

function statusClass(status: string, deadline: string | null) {
  if (status === "geleverd") return "bg-success/15 text-success border-success/30";
  if (status === "n.v.t.") return "bg-muted text-muted-foreground border-border opacity-70";
  return "bg-muted text-foreground border-border";
}

export function ContractDeliverablesSection({ contractId }: { contractId: string }) {
  const { canEdit } = useAuth();
  const { data: deliverables = [], isLoading, upsert, remove } = useContractDeliverables(contractId);
  const { data: types = [] } = useDeliverableTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContractDeliverable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractDeliverable | null>(null);

  const typeLabels = useMemo(() => {
    const m = new Map<string, string>();
    types.forEach((t) => m.set(t.slug, t.label));
    return m;
  }, [types]);

  const today = new Date().toISOString().slice(0, 10);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (d: ContractDeliverable) => { setEditing(d); setDialogOpen(true); };

  const handleSave = async (data: any) => {
    await upsert.mutateAsync(data);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast.success("Tegenprestatie verwijderd.");
    } catch {
      toast.error("Fout bij verwijderen.");
    }
    setDeleteTarget(null);
  };

  return (
    <section className="surface-card p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Gift className="h-4 w-4" /> Tegenprestaties
        </h2>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Tegenprestatie toevoegen
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : deliverables.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nog geen tegenprestaties gedefinieerd.</p>
      ) : (
        <ul className="divide-y divide-border">
          {deliverables.map((d) => {
            const overdue = d.deadline && d.status === "te leveren" && d.deadline < today;
            return (
              <li key={d.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium">
                      {typeLabels.get(d.type) ?? d.type}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass(d.status, d.deadline)}`}>
                      {d.status}
                    </span>
                    {d.deadline && (
                      <span className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        Deadline: {formatDate(d.deadline)}
                      </span>
                    )}
                  </div>
                  {d.omschrijving && <p className="text-sm">{d.omschrijving}</p>}
                  {(d.aantal != null || d.kanaal) && (
                    <p className="text-xs text-muted-foreground">
                      {d.aantal != null ? `${d.aantal}x` : ""}
                      {d.aantal != null && d.kanaal ? " · " : ""}
                      {d.kanaal || ""}
                    </p>
                  )}
                  {d.geleverd_op && (
                    <p className="text-xs text-muted-foreground">Geleverd op {formatDate(d.geleverd_op)}</p>
                  )}
                  {(d.geschatte_waarde != null || d.waarde_score != null) && (
                    <p className="text-xs text-muted-foreground">
                      {d.geschatte_waarde != null && <>Geschatte waarde: €{d.geschatte_waarde.toLocaleString("nl-BE")}</>}
                      {d.geschatte_waarde != null && d.waarde_score != null && " · "}
                      {d.waarde_score != null && <>Score: {d.waarde_score}/5</>}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(d)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ContractDeliverableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contractId={contractId}
        deliverable={editing}
        onSave={handleSave}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={deleteTarget ? (typeLabels.get(deleteTarget.type) ?? "tegenprestatie") : "tegenprestatie"}
        isLoading={remove.isPending}
      />
    </section>
  );
}