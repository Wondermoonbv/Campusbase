import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useContracten } from "@/hooks/useContracten";
import { useScholen } from "@/hooks/useScholen";
import { useEvenementen } from "@/hooks/useEvenementen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { ContractDeliverablesSection } from "@/components/contracts/ContractDeliverablesSection";
import { OrganisatieLabel } from "@/components/organisaties/OrganisatieLabel";
import { AttachmentsSection } from "@/components/shared/AttachmentsSection";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import { ArrowLeft, Pencil, Trash2, Calendar, ExternalLink, FileText, CalendarDays } from "lucide-react";
import { INVOICE_STATUS_LABELS, invoiceStatusVariant, DOCUMENT_STATUS_LABELS, documentStatusVariant, ORGANISATIE_TYPE_LABELS } from "@/lib/event-labels";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Contract } from "@/types/crm";

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
}

function getLifecycleBadge(c: Contract): { label: string; className: string } {
  const now = new Date();
  const start = new Date(c.start_date);
  const end = new Date(c.end_date);
  const renewal = c.renewal_date ? new Date(c.renewal_date) : null;
  if (end < now) return { label: "Verlopen", className: "bg-destructive/10 text-destructive border-destructive/30" };
  if (start > now) return { label: "Toekomstig", className: "bg-primary/10 text-primary border-primary/30" };
  if (renewal && renewal >= now && (renewal.getTime() - now.getTime()) / 86400000 <= 30) {
    return { label: "Verloopt binnenkort", className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200" };
  }
  return { label: "Actief", className: "bg-success/15 text-success border-success/30" };
}

function daysHint(date: string | null): string | null {
  if (!date) return null;
  const diff = Math.floor((new Date(date).getTime() - Date.now()) / 86400000);
  if (diff > 0) return `over ${diff} dag${diff === 1 ? "" : "en"}`;
  if (diff < 0) return `${Math.abs(diff)} dag${Math.abs(diff) === 1 ? "" : "en"} geleden`;
  return "vandaag";
}

export default function ContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const { contracten, isLoading, upsertContract, deleteContract } = useContracten();
  const { scholen } = useScholen();
  const { evenementen } = useEvenementen();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const contract = useMemo(() => contracten.find((c) => c.id === id), [contracten, id]);
  const school = contract ? scholen.find((s) => s.id === contract.organisatie_id) : null;
  const linkedEvents = useMemo(() => {
    if (!contract) return [];
    return (contract.linked_event_ids || [])
      .map((eid) => evenementen.find((e) => e.id === eid))
      .filter(Boolean) as typeof evenementen;
  }, [contract, evenementen]);

  const handleSave = useCallback(async (saved: Contract) => {
    try {
      await upsertContract.mutateAsync(saved);
      toast.success("Contract opgeslagen.");
    } catch {
      toast.error("Fout bij opslaan.");
    }
  }, [upsertContract]);

  const handleDelete = useCallback(async () => {
    if (!contract) return;
    try {
      await deleteContract.mutateAsync({ id: contract.id, name: `Contract ${contract.contract_type}` });
      toast.success("Contract verwijderd.");
      navigate("/contracten");
    } catch (error) {
      handleDeleteError(error, "contract");
    }
    setDeleteOpen(false);
  }, [contract, deleteContract, navigate]);

  if (isLoading) {
    return (
      <div className="page-container max-w-4xl space-y-4 animate-fade-in-up">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="page-container max-w-4xl animate-fade-in-up">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contracten")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Terug
        </Button>
        <p className="mt-6 text-muted-foreground">Contract niet gevonden.</p>
      </div>
    );
  }

  const lifecycle = getLifecycleBadge(contract);
  const renewalHint = daysHint(contract.renewal_date);

  return (
    <div className="page-container max-w-4xl animate-fade-in-up space-y-4 sm:space-y-6">
      {/* HEADER */}
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground">
          <Link to="/contracten" className="hover:text-foreground hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Contracten & Partnerships
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="text-xl sm:text-2xl font-semibold truncate">{school?.name ?? "—"}<OrganisatieLabel organisatieId={school?.id} /></h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                {contract.contract_type}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${lifecycle.className}`}>
                {lifecycle.label}
              </span>
              <StatusBadge status={contract.status} />
              {contract.invoice_status && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${invoiceStatusVariant(contract.invoice_status)}`}>
                  {INVOICE_STATUS_LABELS[contract.invoice_status] || contract.invoice_status}
                </span>
              )}
              {contract.document_status && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${documentStatusVariant(contract.document_status)}`}>
                  {DOCUMENT_STATUS_LABELS[contract.document_status] || contract.document_status}
                </span>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" className="h-10 sm:h-9" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Bewerken
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" className="h-10 sm:h-9 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* OVERZICHT */}
      <section className="surface-card p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Overzicht
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Startdatum</p>
            <p className="text-sm font-medium mt-1">{formatDate(contract.start_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Einddatum</p>
            <p className="text-sm font-medium mt-1">{formatDate(contract.end_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vernieuwingsdatum</p>
            <p className="text-sm font-medium mt-1">{formatDate(contract.renewal_date)}</p>
            {renewalHint && (
              <p className="text-xs text-muted-foreground mt-0.5">{renewalHint}</p>
            )}
          </div>
        </div>
        {contract.value != null && (
          <div>
            <p className="text-xs text-muted-foreground">Waarde</p>
            <p className="text-sm font-medium mt-1 tabular-nums">€{contract.value.toLocaleString("nl-BE")}</p>
          </div>
        )}
        {contract.description && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Beschrijving</p>
            <p className="text-sm whitespace-pre-wrap">{contract.description}</p>
          </div>
        )}
        {contract.notes && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Notities</p>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{contract.notes}</p>
          </div>
        )}
        {contract.document_url && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Externe link</p>
            <a href={contract.document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ExternalLink className="h-3.5 w-3.5" /> Document bekijken
            </a>
          </div>
        )}
      </section>

      {/* DOCUMENTEN */}
      <section className="surface-card p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <FileText className="h-4 w-4" /> Documenten
        </h2>
        <AttachmentsSection entityType="contract" entityId={contract.id} />
      </section>

      {/* GEKOPPELDE EVENEMENTEN */}
      <section className="surface-card p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Gekoppelde evenementen
        </h2>
        {linkedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Geen gekoppelde evenementen.</p>
        ) : (
          <ul className="divide-y divide-border">
            {linkedEvents.map((event) => (
              <li key={event.id}>
                <Link
                  to={`/evenementen/${event.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{event.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                  </div>
                  <StatusBadge status={event.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* TEGENPRESTATIES */}
      <ContractDeliverablesSection contractId={contract.id} />

      <ContractFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contract={contract}
        onSave={handleSave}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        itemName={school?.name ?? "contract"}
        isLoading={deleteContract.isPending}
      />
    </div>
  );
}