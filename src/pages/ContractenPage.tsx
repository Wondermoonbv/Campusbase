import { useMemo, useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useContracten } from "@/hooks/useContracten";
import { useScholen } from "@/hooks/useScholen";
import { useProfiles } from "@/hooks/useProfiles";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Plus, ChevronRight, Pencil, Trash2, FileText, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { OrganisatieLabel } from "@/components/organisaties/OrganisatieLabel";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import type { Contract, School } from "@/types/crm";
import { toast } from "sonner";
import { writeAuditLog } from "@/lib/audit";
import { INVOICE_STATUS_LABELS, invoiceStatusVariant, DOCUMENT_STATUS_LABELS, documentStatusVariant, ORGANISATIE_TYPE_LABELS } from "@/lib/event-labels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const BULK_STATUS_OPTIONS = [
  { value: "in onderhandeling", label: "In onderhandeling" },
  { value: "actief", label: "Actief" },
  { value: "afgelopen", label: "Afgelopen" },
];
const BULK_INVOICE_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "ontvangen", label: "Ontvangen" },
  { value: "betaald", label: "Betaald" },
];
const BULK_DOCUMENT_OPTIONS = [
  { value: "opgemaakt", label: "Opgemaakt" },
  { value: "getekend", label: "Getekend" },
  { value: "tegengetekend", label: "Tegengetekend" },
  { value: "__null__", label: "Leegmaken" },
];

function formatStatusLabel(status: string) {
  if (!status) return "Onbekend";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function OrganisatieCell({ school }: { school?: School }) {
  if (!school) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col">
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {school.name}
        {school.parent_id && <Badge variant="secondary" className="text-[10px]">Campus</Badge>}
        <Badge variant="outline" className="text-[10px]">{ORGANISATIE_TYPE_LABELS[school.type] || school.type}</Badge>
      </span>
      <OrganisatieLabel organisatie={school} />
    </div>
  );
}


function getExpiryColor(endDate: string) {
  const now = new Date(); const end = new Date(endDate);
  const days = Math.floor((end.getTime() - now.getTime()) / 86400000);
  if (days < 0) return "bg-destructive/10 border-l-4 border-l-destructive";
  if (days <= 90) return "bg-warning/5 border-l-4 border-l-accent";
  return "border-l-4 border-l-success";
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="surface-card p-4 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
          <div className="flex gap-2"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-20" /></div>
        </div>
      ))}
    </div>
  );
}

export default function ContractenPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filterExpiring = searchParams.get("expiring") === "90";
  const { contracten, isLoading, upsertContract, deleteContract } = useContracten();
  const { scholen } = useScholen();
  const { profiles } = useProfiles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContract, setEditContract] = useState<Contract | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const { canEdit } = useAuth();
  const { sort, toggleSort } = useSort("school");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ field: "status" | "invoice_status" | "document_status"; value: string | null; label: string; fieldLabel: string } | null>(null);
  const [bulkPending, setBulkPending] = useState(false);

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (checked) next.add(id); else next.delete(id); return next; });
  }, []);

  const applyBulk = useCallback(async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkPending(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("contracten")
        .update({ [bulkAction.field]: bulkAction.value } as any)
        .in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} contract${ids.length !== 1 ? "en" : ""} bijgewerkt`);
      setSelectedIds(new Set());
      setBulkAction(null);
      qc.invalidateQueries({ queryKey: ["contracten"] });
    } catch (e: any) {
      toast.error(e?.message || "Bulkwijziging mislukt");
    } finally {
      setBulkPending(false);
    }
  }, [bulkAction, selectedIds, qc]);

  const handleSave = useCallback(async (saved: Contract) => {
    try { await upsertContract.mutateAsync(saved); } catch { toast.error("Fout bij opslaan."); }
  }, [upsertContract]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteContract.mutateAsync({ id: deleteTarget.id, name: `Contract ${deleteTarget.contract_type}` });
      toast.success("Contract verwijderd.");
    } catch (error) {
      handleDeleteError(error, "contract");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteContract]);

  const schoolMap = useMemo(() => new Map(scholen.map((s) => [s.id, s])), [scholen]);
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p.full_name])), [profiles]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    contracten.forEach((c) => { if (c.status) set.add(c.status); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [contracten]);

  const baseList = useMemo(() => {
    let list = [...contracten];
    if (filterExpiring) {
      const now = new Date(); const in90 = new Date(now.getTime() + 90 * 86400000);
      list = list.filter((c) => { const d = new Date(c.end_date); return d >= now && d <= in90 && c.status === "actief"; });
    }
    if (statusFilter) {
      list = list.filter((c) => c.status === statusFilter);
    }
    return list;
  }, [contracten, filterExpiring, statusFilter]);

  const sorted = useMemo(() => sortItems(baseList, sort, (c, key) => {
    switch (key) {
      case "school": return schoolMap.get(c.organisatie_id)?.name ?? "";
      case "type": return c.contract_type; case "start": return new Date(c.start_date).getTime();
      case "end": return new Date(c.end_date).getTime(); case "renewal": return new Date(c.renewal_date).getTime();
      case "status": return c.status; case "value": return c.value ?? 0;
      default: return schoolMap.get(c.organisatie_id)?.name ?? "";
    }
  }), [baseList, sort, schoolMap]);

  const allVisibleSelected = sorted.length > 0 && sorted.every((c) => selectedIds.has(c.id));
  const someVisibleSelected = sorted.some((c) => selectedIds.has(c.id));
  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) sorted.forEach((c) => next.add(c.id));
      else sorted.forEach((c) => next.delete(c.id));
      return next;
    });
  };

  const exportCSV = useCallback(() => {
    const headers = ["Organisatie", "Type", "Start", "Einde", "Vernieuwing", "Status", "Waarde", "Beschrijving"];
    const rows = sorted.map((c) => { const school = schoolMap.get(c.organisatie_id); return [school?.name ?? "", c.contract_type, c.start_date, c.end_date, c.renewal_date, c.status, c.value ?? "", c.description ?? ""]; });
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n"); const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "contracten_export.csv"; a.click();
    writeAuditLog({ action: "export", entity_type: "export", entity_id: "contracten-csv", entity_name: "Contracten export", changes: { row_count: rows.length, format: "csv" } });
  }, [sorted, schoolMap]);

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Contracten & Partnerships</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
          {canEdit && <Button size="sm" className="h-10 sm:h-8" onClick={() => { setEditContract(undefined); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Contract toevoegen</Button>}
        </div>
      </div>

      {isLoading ? <ListSkeleton /> : contracten.length === 0 ? (
        <EmptyState icon={FileText} title="Nog geen contracten toegevoegd" description="Voeg je eerste contract toe." actionLabel="Contract toevoegen" onAction={() => { setEditContract(undefined); setDialogOpen(true); }} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Button
              variant={statusFilter === "" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusFilter("")}
            >
              Alle
              {statusFilter === "" && <X className="h-3 w-3 ml-1" onClick={(e) => { e.stopPropagation(); }} />}
            </Button>
            {availableStatuses.map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setStatusFilter(status)}
              >
                {formatStatusLabel(status)}
              </Button>
            ))}
            {statusFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setStatusFilter("")}
              >
                <X className="h-3 w-3 mr-1" /> Wis filter
              </Button>
            )}
          </div>

          {baseList.length === 0 ? (
            <EmptyState icon={FileText} title="Geen contracten gevonden" description="Probeer een andere statusfilter." />
          ) : (
            <>
              {canEdit && selectedIds.size > 0 && (
                <div className="surface-card p-3 mb-3 flex flex-col sm:flex-row sm:items-center gap-3 border-primary/40">
                  <div className="text-sm font-medium">{selectedIds.size} contract{selectedIds.size !== 1 ? "en" : ""} geselecteerd</div>
                  <div className="flex flex-wrap gap-2 sm:ml-auto items-center">
                    <Select value="" onValueChange={(v) => { const o = BULK_STATUS_OPTIONS.find(x => x.value === v); if (o) setBulkAction({ field: "status", value: o.value, label: o.label, fieldLabel: "status" }); }}>
                      <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Status wijzigen naar ..." /></SelectTrigger>
                      <SelectContent>{BULK_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value="" onValueChange={(v) => { const o = BULK_INVOICE_OPTIONS.find(x => x.value === v); if (o) setBulkAction({ field: "invoice_status", value: o.value, label: o.label, fieldLabel: "factuurstatus" }); }}>
                      <SelectTrigger className="w-[240px] h-9"><SelectValue placeholder="Factuurstatus wijzigen naar ..." /></SelectTrigger>
                      <SelectContent>{BULK_INVOICE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value="" onValueChange={(v) => { const o = BULK_DOCUMENT_OPTIONS.find(x => x.value === v); if (o) setBulkAction({ field: "document_status", value: o.value === "__null__" ? null : o.value, label: o.label, fieldLabel: "documentstatus" }); }}>
                      <SelectTrigger className="w-[240px] h-9"><SelectValue placeholder="Documentstatus wijzigen naar ..." /></SelectTrigger>
                      <SelectContent>{BULK_DOCUMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Selectie wissen</Button>
                  </div>
                </div>
              )}
              <div className="block md:hidden space-y-2">
                {sorted.map((c) => {
                  const school = c.school ?? schoolMap.get(c.organisatie_id);
                  return (
                    <div key={c.id} className={`surface-card overflow-hidden ${getExpiryColor(c.end_date)}`}>
                      <button type="button" className="w-full text-left p-4 active:scale-[0.99] transition-transform" onClick={() => navigate(`/contracten/${c.id}`)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <OrganisatieCell school={school} />
                            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{c.contract_type}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(c.start_date).toLocaleDateString("nl-BE")} → {new Date(c.end_date).toLocaleDateString("nl-BE")}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge status={c.status} />
                            {c.invoice_status && (
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${invoiceStatusVariant(c.invoice_status)}`}>
                                {INVOICE_STATUS_LABELS[c.invoice_status] || c.invoice_status}
                              </span>
                            )}
                            {c.document_status && (
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${documentStatusVariant(c.document_status)}`}>
                                {DOCUMENT_STATUS_LABELS[c.document_status] || c.document_status}
                              </span>
                            )}
                            {c.value && <span className="text-xs font-medium tabular-nums">€{c.value.toLocaleString("nl-BE")}</span>}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="surface-card overflow-hidden hidden md:block">
                <Table><TableHeader><TableRow>
                  {canEdit && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allVisibleSelected ? true : (someVisibleSelected ? "indeterminate" : false)}
                        onCheckedChange={(c) => toggleAllVisible(!!c)}
                        aria-label="Selecteer alle zichtbare contracten"
                      />
                    </TableHead>
                  )}
                  <SortableTableHead sortKey="school" currentSort={sort} onSort={toggleSort}>Organisatie</SortableTableHead>
                  <SortableTableHead sortKey="type" currentSort={sort} onSort={toggleSort}>Type</SortableTableHead>
                  <SortableTableHead sortKey="start" currentSort={sort} onSort={toggleSort}>Start</SortableTableHead>
                  <SortableTableHead sortKey="end" currentSort={sort} onSort={toggleSort}>Einde</SortableTableHead>
                  <SortableTableHead sortKey="renewal" currentSort={sort} onSort={toggleSort} className="hidden lg:table-cell">Vernieuwingsdatum</SortableTableHead>
                  <SortableTableHead sortKey="status" currentSort={sort} onSort={toggleSort}>Status</SortableTableHead>
                  <TableHead>Verantwoordelijke</TableHead>
                  <TableHead>Factuur</TableHead>
                  <TableHead>Ondertekening</TableHead>
                  <SortableTableHead sortKey="value" currentSort={sort} onSort={toggleSort} className="text-right">Waarde</SortableTableHead>
                  <TableHead className="w-24" />
                </TableRow></TableHeader>
                  <TableBody>{sorted.map((c) => {
                    const school = c.school ?? schoolMap.get(c.organisatie_id);
                    return (
                        <TableRow key={c.id} className={`hover:bg-muted/30 cursor-pointer ${getExpiryColor(c.end_date)}`} onClick={() => navigate(`/contracten/${c.id}`)}>
                          {canEdit && (
                            <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
                              <Checkbox
                                checked={selectedIds.has(c.id)}
                                onCheckedChange={(v) => toggleOne(c.id, !!v)}
                                aria-label="Contract selecteren"
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium"><OrganisatieCell school={school} /></TableCell>
                          <TableCell className="capitalize">{c.contract_type}</TableCell>
                          <TableCell>{new Date(c.start_date).toLocaleDateString("nl-BE")}</TableCell>
                          <TableCell>{new Date(c.end_date).toLocaleDateString("nl-BE")}</TableCell>
                          <TableCell className="hidden lg:table-cell">{c.renewal_date ? (<span className={new Date(c.renewal_date) < new Date() ? "text-amber-700 dark:text-amber-300 font-medium" : ""}>{new Date(c.renewal_date).toLocaleDateString("nl-BE")}{new Date(c.renewal_date) < new Date() && " ⚠"}</span>) : "—"}</TableCell>
                          <TableCell><StatusBadge status={c.status} /></TableCell>
                          <TableCell>
                            {c.verantwoordelijke_id ? (
                              <span title={profileMap.get(c.verantwoordelijke_id) ?? ""} className="text-sm">
                                {(profileMap.get(c.verantwoordelijke_id) ?? "—").split(" ")[0]}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {c.invoice_status && (
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${invoiceStatusVariant(c.invoice_status)}`}>
                                {INVOICE_STATUS_LABELS[c.invoice_status] || c.invoice_status}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {c.document_status && (
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${documentStatusVariant(c.document_status)}`}>
                                {DOCUMENT_STATUS_LABELS[c.document_status] || c.document_status}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{c.value ? `€${c.value.toLocaleString("nl-BE")}` : "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-0.5 items-center justify-end">
                              {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Contract bewerken" onClick={(e) => { e.stopPropagation(); setEditContract(c); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>}
                              {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Contract verwijderen" onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TableCell>
                        </TableRow>
                    );
                  })}</TableBody></Table>
                <div className="p-3 border-t border-border text-xs text-muted-foreground flex flex-wrap gap-4">
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success" /> Meer dan 90 dagen</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-accent" /> Binnen 90 dagen</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive" /> Verlopen</span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <ContractFormDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditContract(undefined); }} contract={editContract} onSave={handleSave} />
      <DeleteConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} itemName={deleteTarget ? (schoolMap.get(deleteTarget.organisatie_id)?.name ?? "contract") : ""} isLoading={deleteContract.isPending} />
    </div>
  );
}
